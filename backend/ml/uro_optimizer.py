import numpy as np
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple

SHIFT_STRESS_WEIGHTS = {
    "night": 3.0,
    "split": 2.0,
    "day": 1.0,
    "off": 0.0
}

def are_trades_compatible(trade_a: Optional[str], trade_b: Optional[str]) -> bool:
    """
    Military Occupational Specialty (MOS) trade matching constraint:
    Ensure swapped personnel have identical or compatible trades:
    Armorer <-> Armorer only, Radio Operator <-> Radio Operator only, GD <-> GD only.
    """
    norm_a = (trade_a or "GD").strip().lower()
    norm_b = (trade_b or "GD").strip().lower()
    return norm_a == norm_b

def _parse_date(val: Any) -> date:
    """Safely parse a date from date, datetime, or ISO string."""
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        return date.fromisoformat(val[:10])
    raise ValueError(f"Unparseable date value: {val}")

def get_shift_interval(d: date, shift_type: str) -> Optional[Tuple[datetime, datetime]]:
    """
    Returns canonical (start_dt, end_dt) for a duty shift on date d.
    - 'day': 08:00 to 16:00 on date d (8 hours)
    - 'split': 08:00 to 20:00 on date d (12 hours spread)
    - 'night': 20:00 on date d to 06:00 on date d+1 (10 hours across midnight)
    - 'off': None (no active duty, 24h rest)
    """
    s_type = (shift_type or "").lower().strip()
    if s_type == "off":
        return None

    dt_base = datetime.combine(d, datetime.min.time())
    if s_type == "night":
        start_dt = dt_base + timedelta(hours=20)
        end_dt = dt_base + timedelta(days=1, hours=6)
        return (start_dt, end_dt)
    elif s_type == "split":
        start_dt = dt_base + timedelta(hours=8)
        end_dt = dt_base + timedelta(hours=20)
        return (start_dt, end_dt)
    elif s_type == "day":
        start_dt = dt_base + timedelta(hours=8)
        end_dt = dt_base + timedelta(hours=16)
        return (start_dt, end_dt)
    else:
        # Default active duty: standard daytime window
        start_dt = dt_base + timedelta(hours=8)
        end_dt = dt_base + timedelta(hours=16)
        return (start_dt, end_dt)

def validate_rest_barrier(shifts: List[Dict[str, Any]], min_rest_hours: float = 8.0) -> bool:
    """
    8-hour rolling rest barrier constraint:
    Ensure no swapped shift violates a minimum 8 hours of rest between consecutive duty shifts.
    """
    intervals = []
    for s in shifts:
        raw_d = s.get("date")
        if not raw_d:
            continue
        try:
            d = _parse_date(raw_d)
        except Exception:
            continue

        interval = get_shift_interval(d, s.get("shift_type"))
        if interval:
            intervals.append(interval)

    if len(intervals) <= 1:
        return True

    # Sort chronologically by shift start time
    intervals.sort(key=lambda x: x[0])

    for i in range(len(intervals) - 1):
        prev_end = intervals[i][1]
        next_start = intervals[i + 1][0]
        rest_hours = (next_start - prev_end).total_seconds() / 3600.0
        if rest_hours < min_rest_hours:
            return False

    return True

def validate_fairness_cap(shifts: List[Dict[str, Any]], max_heavy_in_7d: int = 2) -> bool:
    """
    Fairness cap constraint:
    No single trooper can absorb >2 high burden shifts ('night' or 'split') in any 7-day period.
    """
    heavy_dates = []
    for s in shifts:
        if s.get("shift_type") in ("night", "split"):
            raw_d = s.get("date")
            if not raw_d:
                continue
            try:
                d = _parse_date(raw_d)
                heavy_dates.append(d)
            except Exception:
                continue

    if len(heavy_dates) <= max_heavy_in_7d:
        return True

    heavy_dates.sort()

    # Check every rolling 7-day window starting from each heavy shift date
    for d in heavy_dates:
        window_end = d + timedelta(days=6)
        count_in_window = sum(1 for hd in heavy_dates if d <= hd <= window_end)
        if count_in_window > max_heavy_in_7d:
            return False

    return True

def optimize_roster(
    personnel_list: List[Dict[str, Any]],
    roster_entries: List[Dict[str, Any]],
    max_swaps: int = 10,
    protect_minimum_manning: bool = True
) -> Dict[str, Any]:
    """
    Unit Resilience Optimizer (URO)
    Greedy constrained roster rebalancer minimizing unit-wide acute burnout risk,
    enforcing:
    1. MOS trade matching (Armorer <-> Armorer, Radio Operator <-> Radio Operator, GD <-> GD)
    2. 8-hour rolling rest barrier between consecutive duty shifts
    3. Fairness cap: <= 2 high-burden shifts (night/split) in any rolling 7-day period
    """
    # 1. Map personnel by ID
    p_map = {p["id"]: dict(p) for p in personnel_list}

    # 2. Group roster entries by personnel_id and date
    p_shifts = {p["id"]: [] for p in personnel_list}
    for r in roster_entries:
        pid = r["personnel_id"]
        if pid in p_shifts:
            p_shifts[pid].append(dict(r))

    # Calculate initial burden & baseline distributions
    before_counts = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
    for p in personnel_list:
        lvl = p.get("risk_level", "green").lower()
        before_counts[lvl] = before_counts.get(lvl, 0) + 1

    # 3. Identify candidates for relief
    # Burden = risk_score * (1.0 + sum(shift_weights) * 0.15)
    burden_scores = {}
    for pid, p in p_map.items():
        shifts = p_shifts.get(pid, [])
        load = sum(SHIFT_STRESS_WEIGHTS.get(s.get("shift_type", "day"), 1.0) for s in shifts)
        burden_scores[pid] = float(p.get("risk_score", 0.3)) * (1.0 + load * 0.15)

    sorted_by_burden = sorted(burden_scores.keys(), key=lambda k: burden_scores[k], reverse=True)

    from scipy.optimize import linear_sum_assignment

    # 4. Identify high-burden relief candidates and resilient swap candidates
    high_candidates = [
        pid for pid in sorted_by_burden
        if float(p_map[pid].get("risk_score", 0.0)) >= 0.50 and
        any(s.get("shift_type") in ("night", "split") for s in p_shifts.get(pid, []))
    ]
    low_candidates = [
        pid for pid in reversed(sorted_by_burden)
        if float(p_map[pid].get("risk_score", 0.0)) < 0.45
    ]

    swaps = []
    swapped_pids = set()

    if high_candidates and low_candidates:
        # Construct exact bipartite cost matrix: Shape (len(high), len(low))
        m = len(high_candidates)
        n = len(low_candidates)
        cost_matrix = np.full((m, n), 1e6)
        match_shifts = {}

        for i, high_pid in enumerate(high_candidates):
            p_high = p_map[high_pid]
            risk_high = float(p_high.get("risk_score", 0.0))
            trade_high = p_high.get("trade", "GD")
            high_shifts = p_shifts.get(high_pid, [])
            heavy_shifts = [s for s in high_shifts if s.get("shift_type") in ("night", "split")]
            if not heavy_shifts:
                continue
            target_shift = heavy_shifts[0]
            shift_date = target_shift.get("date")

            for j, low_pid in enumerate(low_candidates):
                if high_pid == low_pid:
                    continue
                p_low = p_map[low_pid]
                risk_low = float(p_low.get("risk_score", 0.0))
                trade_low = p_low.get("trade", "GD")

                if not are_trades_compatible(trade_high, trade_low):
                    continue
                if (risk_high - risk_low) < 0.15:
                    continue

                low_shifts_on_date = [s for s in p_shifts.get(low_pid, []) if s.get("date") == shift_date]
                if not low_shifts_on_date:
                    continue
                candidate_shift = low_shifts_on_date[0]
                if candidate_shift.get("shift_type") not in ("off", "day"):
                    continue

                # Build hypothetical schedules to test hard constraints
                high_shifts_curr = p_shifts.get(high_pid, [])
                low_shifts_curr = p_shifts.get(low_pid, [])

                hypo_high = [dict(s, shift_type=candidate_shift.get("shift_type", "day"), duty_type=candidate_shift.get("duty_type", "standby")) if s.get("date") == shift_date else dict(s) for s in high_shifts_curr]
                hypo_low = [dict(s, shift_type=target_shift.get("shift_type", "night"), duty_type=target_shift.get("duty_type", "patrol")) if s.get("date") == shift_date else dict(s) for s in low_shifts_curr]

                if not validate_rest_barrier(hypo_high, min_rest_hours=8.0):
                    continue
                if not validate_rest_barrier(hypo_low, min_rest_hours=8.0):
                    continue
                if not validate_fairness_cap(hypo_low, max_heavy_in_7d=2):
                    continue

                # Mathematical Objective: Maximize relief benefit while penalizing excess load on low trooper
                benefit = (risk_high - risk_low) * 100.0 - (0.05 * burden_scores[low_pid])
                cost_matrix[i, j] = -benefit
                match_shifts[(i, j)] = (high_pid, low_pid, target_shift, candidate_shift)

        # Solve globally optimal minimum-cost maximum-benefit bipartite matching
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        for i, j in zip(row_ind, col_ind):
            if len(swaps) >= max_swaps:
                break
            if cost_matrix[i, j] >= 1e5:
                continue

            high_pid, low_pid, target_shift, low_shift = match_shifts[(i, j)]
            if high_pid in swapped_pids or low_pid in swapped_pids:
                continue

            p_high = p_map[high_pid]
            p_low = p_map[low_pid]
            risk_high = float(p_high.get("risk_score", 0.0))

            # Execute Swap
            high_duty_orig = target_shift.get("duty_type", "patrol")
            high_shift_orig = target_shift.get("shift_type", "night")
            high_hours_orig = float(target_shift.get("hours", 10.0))

            low_duty_orig = low_shift.get("duty_type", "standby")
            low_shift_orig = low_shift.get("shift_type", "day")
            low_hours_orig = float(low_shift.get("hours", 8.0))

            # Apply swap in active shift collections
            target_shift["duty_type"] = low_duty_orig
            target_shift["shift_type"] = low_shift_orig
            target_shift["hours"] = low_hours_orig

            low_shift["duty_type"] = high_duty_orig
            low_shift["shift_type"] = high_shift_orig
            low_shift["hours"] = high_hours_orig

            # Projected risk adjustments
            relief_delta = 0.22  # Significant drop for relieved personnel
            absorption_delta = 0.06  # Modest increase for resilient trooper

            new_risk_high = round(max(0.20, risk_high - relief_delta), 2)
            new_risk_low = round(min(0.55, float(p_low.get("risk_score", 0.0)) + absorption_delta), 2)

            p_high["risk_score"] = new_risk_high
            p_low["risk_score"] = new_risk_low

            swapped_pids.add(high_pid)
            swapped_pids.add(low_pid)

            swaps.append({
                "swap_id": len(swaps) + 1,
                "roster_id_a": target_shift.get("id"),
                "roster_id_b": low_shift.get("id"),
                "person_a": {
                    "id": high_pid,
                    "name": p_high.get("name", "Unknown"),
                    "rank": p_high.get("rank", "Constable"),
                    "trade": p_high.get("trade", "GD"),
                    "risk_level": "red" if risk_high >= 0.75 else "orange",
                    "current_duty": f"{high_shift_orig}_{high_duty_orig}",
                    "original_shift_type": high_shift_orig,
                    "original_duty_type": high_duty_orig,
                    "original_hours": high_hours_orig,
                    "new_shift_type": low_shift_orig,
                    "new_duty_type": low_duty_orig,
                    "new_hours": low_hours_orig
                },
                "person_b": {
                    "id": low_pid,
                    "name": p_low.get("name", "Unknown"),
                    "rank": p_low.get("rank", "Constable"),
                    "trade": p_low.get("trade", "GD"),
                    "risk_level": "green" if float(p_low.get("risk_score", 0)) < 0.25 else "yellow",
                    "current_duty": f"{low_shift_orig}_{low_duty_orig}",
                    "original_shift_type": low_shift_orig,
                    "original_duty_type": low_duty_orig,
                    "original_hours": low_hours_orig,
                    "new_shift_type": high_shift_orig,
                    "new_duty_type": high_duty_orig,
                    "new_hours": high_hours_orig
                },
                "date": str(shift_date),
                "trade": p_high.get("trade", "GD"),
                "projected_risk_change_a": {"from": risk_high, "to": new_risk_high},
                "projected_risk_change_b": {"from": float(p_map[low_pid].get("risk_score", 0.0)), "to": new_risk_low}
            })

    # Calculate post-optimization distributions
    after_counts = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
    for pid, p in p_map.items():
        sc = float(p.get("risk_score", 0.3))
        if sc < 0.25:
            lvl = "green"
        elif sc < 0.50:
            lvl = "yellow"
        elif sc < 0.75:
            lvl = "orange"
        else:
            lvl = "red"
        after_counts[lvl] += 1

    # Reduction in acute (Orange + Red) cases
    acute_before = before_counts.get("orange", 0) + before_counts.get("red", 0)
    acute_after = after_counts.get("orange", 0) + after_counts.get("red", 0)
    if acute_before > 0:
        reduction_pct = round(((acute_before - acute_after) / acute_before) * 100.0, 1)
    else:
        reduction_pct = 0.0

    return {
        "before": before_counts,
        "after": after_counts,
        "swaps": swaps,
        "risk_reduction_pct": max(0.0, reduction_pct)
    }


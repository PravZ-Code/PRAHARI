"""
Tests for Live Dynamic Welfare Bulletin Service and REST Endpoint.
Verifies internet feed retrieval, tag categorization, in-memory caching,
offline/air-gap fallback, and API response contracts.
"""

from fastapi.testclient import TestClient
from main import app
from services.bulletin_service import (
    get_live_bulletins,
    _categorize_title,
    _format_pubdate,
    STATUTORY_OFFLINE_BULLETINS
)

client = TestClient(app)


def test_categorize_title():
    assert _categorize_title("CRPF Family Welfare Centre Wins Trophy") == "CRPF WELFARE"
    assert _categorize_title("New SOP for force protection and night guard post") == "FORCE PROTECTION"
    assert _categorize_title("Ayushman CAPF hospital treatment expansion") == "HEALTH & HOUSING"
    assert _categorize_title("Union Home Minister Amit Shah issues directive") == "MHA DIRECTIVE"
    assert _categorize_title("Random operational report") == "DEFENSE UPDATE"


def test_format_pubdate():
    rfc_date = "Wed, 24 Jun 2026 07:00:00 GMT"
    formatted, is_new = _format_pubdate(rfc_date)
    assert "2026" in formatted
    assert "Jun" in formatted

    # None fallback
    formatted_now, _ = _format_pubdate(None)
    assert len(formatted_now) > 0


def test_get_live_bulletins_contract():
    data = get_live_bulletins(force_refresh=False, limit=6)
    assert "status" in data
    assert "source" in data
    assert "bulletins" in data
    assert "last_updated" in data
    assert len(data["bulletins"]) <= 6
    assert data["total"] > 0

    first = data["bulletins"][0]
    assert "title" in first
    assert "source" in first
    assert "date" in first
    assert "tag" in first
    assert "link" in first
    assert "is_new" in first


def test_offline_fallback(monkeypatch):
    """
    Simulates an air-gapped environment with total network failure.
    Ensures bulletin service gracefully falls back to statutory defense bulletins.
    """
    import urllib.request

    def mock_urlopen(*args, **kwargs):
        raise urllib.error.URLError("Network unreachable (Air-gapped tactical zone)")

    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)

    data = get_live_bulletins(force_refresh=True, limit=5)
    assert data["source"] == "statutory_offline"
    assert data["total"] == 5
    assert any("Prahari" in b["title"] for b in data["bulletins"])


def test_api_welfare_bulletins_endpoint():
    res = client.get("/api/welfare/bulletins?limit=5")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["status"] in ("success", "cached")
    assert json_data["total"] <= 5
    assert len(json_data["bulletins"]) > 0
    assert "title" in json_data["bulletins"][0]

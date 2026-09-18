import { getStoredUser } from "./auth";
import { User } from "./types";

export type PersonaType = "soldier" | "commander" | "welfare" | "admin";

export interface PersonaProfile {
  type: PersonaType;
  title: string;
  subtitle: string;
  name: string;
  rank: string;
  unit: string;
  badge: string;
  badgeColor: string;
  primaryPath: string;
  description: string;
}

function profileFromUser(user: User): PersonaProfile {
  const role = user.role === "welfare_officer" ? "welfare" : user.role;
  const type = (["soldier", "commander", "welfare", "admin"].includes(role) ? role : "soldier") as PersonaType;
  const descriptions: Record<PersonaType, string> = {
    soldier: "Submit leave, emergency, welfare, and grievance requests.",
    commander: "Review unit approvals, readiness, rest compliance, and duty rosters.",
    welfare: "Manage confidential welfare cases and recovery outcomes.",
    admin: "Review governance, audit, synchronization, and system security.",
  };
  return {
    type,
    title: user.rank || user.role,
    subtitle: user.unit_name || "Assigned unit",
    name: user.name || user.username,
    rank: user.rank || user.role,
    unit: user.unit_name || "Assigned unit",
    badge: `${user.role} portal`,
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    primaryPath: type === "soldier" ? "/portal" : `/${type}`,
    description: descriptions[type],
  };
}

export function getActivePersona(): PersonaType {
  if (typeof window === "undefined") return "soldier";

  const user = getStoredUser();
  if (user) {
    if (user.role === "commander") return "commander";
    if (user.role === "welfare") return "welfare";
    if (user.role === "admin") return "admin";
  }

  return "soldier";
}

export function getActiveProfile(): PersonaProfile | null {
  const user = getStoredUser();
  return user ? profileFromUser(user) : null;
}

export function switchPersona(): PersonaProfile | null {
  return getActiveProfile();
}

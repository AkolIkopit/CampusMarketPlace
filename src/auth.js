export const ROLE_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Trade Facility Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

const AUTH_INTENT_KEY = "uniMart.authIntent";
const LEGACY_AUTH_INTENT_KEY = "campusSwap.authIntent";

export function normalizeRole(role) {
  if (!role) return "";

  const value = role.toString().trim().toLowerCase();

  if (value === "trade facility staff" || value === "trade_staff") {
    return "staff";
  }

  if (value === "student" || value === "staff" || value === "admin") {
    return value;
  }

  return "";
}

export function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_OPTIONS.find((option) => option.value === normalizedRole)?.label || "Student";
}

export function getDefaultFullName(user) {
  const metadata = user?.user_metadata || {};

  return (
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user?.email?.split("@")[0] ||
    ""
  ).trim();
}

export function saveAuthIntent(intent) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    AUTH_INTENT_KEY,
    JSON.stringify({
      mode: intent?.mode || "login",
      role: normalizeRole(intent?.role),
      savedAt: Date.now(),
    })
  );
}

export function readAuthIntent() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue =
      window.localStorage.getItem(AUTH_INTENT_KEY) ||
      window.localStorage.getItem(LEGACY_AUTH_INTENT_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);

    return {
      mode: parsed?.mode || "login",
      role: normalizeRole(parsed?.role),
    };
  } catch {
    return null;
  }
}

export function clearAuthIntent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_INTENT_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_INTENT_KEY);
}

import Constants from "expo-constants";

export type Variant = "customer" | "partner" | "ops";
export type Role =
  | "customer"
  | "service_provider"
  | "technician"
  | "admin"
  | "dispatcher";

const extra = (Constants.expoConfig?.extra || {}) as {
  variant?: Variant;
  apiUrl?: string;
  brandColor?: string;
};

export const VARIANT: Variant = extra.variant || "customer";
export const API_URL = (extra.apiUrl || "https://servizato.in").replace(/\/$/, "");
export const BRAND = extra.brandColor || "#DD1D4A";

/** Which account roles may sign in to which app. */
export const ROLES_FOR_VARIANT: Record<Variant, Role[]> = {
  customer: ["customer"],
  partner: ["service_provider", "technician"],
  ops: ["admin", "dispatcher"],
};

export const APP_FOR_ROLE: Record<Role, string> = {
  customer: "Servizato",
  service_provider: "Servizato Partner",
  technician: "Servizato Partner",
  admin: "Servizato Ops",
  dispatcher: "Servizato Ops",
};

export function roleAllowed(role?: string | null): role is Role {
  return Boolean(role && (ROLES_FOR_VARIANT[VARIANT] as string[]).includes(role));
}

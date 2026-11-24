export function money(value: number | undefined | null, currency = "INR") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

export function dateTime(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "To be confirmed";
  try {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return new Date(value).toLocaleString();
  }
}

export function shortDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return new Date(value).toDateString();
  }
}

/** "in_progress" -> "In progress"; technician -> Pro (matches the website wording). */
export function label(value?: string | null) {
  if (!value) return "—";
  const text = value.replace(/_/g, " ").replace(/technician/gi, "Pro");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function addressText(address?: {
  addressLine?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
} | null) {
  if (!address) return "";
  return [address.addressLine, address.locality, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
}

export function idOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "_id" in value) return String((value as { _id: unknown })._id);
  return String(value);
}

export function statusTone(status?: string | null): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "completed":
    case "paid":
    case "approved":
    case "verified":
    case "confirmed":
    case "accepted":
      return "success";
    case "cancelled":
    case "rejected":
    case "declined":
    case "suspended":
    case "failed":
      return "danger";
    case "pending":
    case "on_hold":
    case "partial":
    case "request_changes":
    case "changes_requested":
    case "unpaid":
      return "warning";
    case "enroute":
    case "arrived":
    case "in_progress":
    case "otp_verified":
    case "assigned":
      return "info";
    default:
      return "neutral";
  }
}

/** 10-digit Indian numbers get +91; the backend requires a country code. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

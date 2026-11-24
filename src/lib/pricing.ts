import { money } from "./format";
import type { PricingModel } from "./types";

export function priceText(p: { finalPrice: number; model?: PricingModel; unit?: string }) {
  switch (p.model) {
    case "quote_required":
      return "Quote after inspection";
    case "starting":
      return `From ${money(p.finalPrice)}`;
    case "per_unit":
      return `${money(p.finalPrice)} / ${p.unit || "unit"}`;
    default:
      return money(p.finalPrice);
  }
}

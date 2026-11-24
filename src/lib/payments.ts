import type { CheckoutSuccess } from "react-native-razorpay";
import { api } from "./api";
import { BRAND } from "./config";

interface OrderResponse {
  order: { id: string; amount: number; currency: string };
  keyId: string;
  customer?: { name?: string; email?: string; phone?: string } | null;
}

/**
 * Same flow as the website: the server creates (or reuses) a Razorpay order for
 * the invoice's balance, the customer pays in Razorpay's native checkout, and the
 * server verifies the signature before marking the invoice paid.
 */
export async function payInvoice(invoiceId: string, invoiceNumber?: string) {
  const { order, keyId, customer } = await api.post<OrderResponse>(`/api/customer/invoices/${invoiceId}/pay`);
  if (!keyId) throw new Error("Online payment isn't configured yet. Please pay the provider directly.");

  let Razorpay: typeof import("react-native-razorpay").default;
  try {
    Razorpay = require("react-native-razorpay").default;
  } catch {
    throw new Error("Payments need the installed app build (not Expo Go).");
  }

  let result: CheckoutSuccess;
  try {
    result = await Razorpay.open({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Servizato",
      description: invoiceNumber ? `Invoice ${invoiceNumber}` : "Service invoice",
      prefill: {
        name: customer?.name,
        email: customer?.email && !customer.email.endsWith("@service.local") ? customer.email : undefined,
        contact: customer?.phone,
      },
      theme: { color: BRAND },
    });
  } catch (error) {
    const e = error as { code?: number; description?: string; error?: { description?: string } };
    // code 0/2 = user closed the sheet
    const text = e?.error?.description || e?.description;
    throw new Error(text && !/cancel/i.test(text) ? text : "Payment was cancelled.");
  }

  return api.post("/api/razorpay/verify", {
    razorpay_order_id: result.razorpay_order_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  });
}

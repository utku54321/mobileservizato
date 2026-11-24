declare module "react-native-razorpay" {
  export interface CheckoutOptions {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    image?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    [key: string]: unknown;
  }
  export interface CheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }
  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>;
  };
  export default RazorpayCheckout;
}

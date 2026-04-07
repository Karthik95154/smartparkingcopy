declare module "react-native-razorpay" {
  export interface RazorpayOptions {
    description?: string;
    image?: string;
    currency?: string;
    key?: string;
    amount?: number;
    name?: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    method?: "upi" | "card" | "netbanking" | "wallet";
    theme?: {
      color?: string;
    };
    method_order?: string[];
    timeout?: number;
  }

  export interface RazorpayPaymentData {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  export interface RazorpayCheckout {
    open(options: RazorpayOptions): Promise<RazorpayPaymentData>;
  }

  const RazorpayCheckout: RazorpayCheckout;
  export default RazorpayCheckout;
}

import Constants from "expo-constants";
import { requestJson } from "./api";
import { Platform } from "react-native";
import RazorpayCheckoutNative from "./RazorpayCheckout";
import RazorpayCheckoutWeb from "./RazorpayCheckout.web";

const RazorpayCheckout = Platform.OS === "web" ? RazorpayCheckoutWeb : RazorpayCheckoutNative;

const RAZORPAY_KEY =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  ((Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)
    ?.razorpayKeyId ?? "") ||
  "rzp_test_SfdxdhiqvyYmg3";
export type PaymentMethod = "upi" | "card";

const formatRazorpayContact = (phone?: string) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (!digitsOnly) {
    return "+919999999999";
  }

  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

const verifyPayment = async ({
  bookingId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const verifyData = await requestJson<{
    success: boolean;
    message?: string;
    error?: string;
  }>("/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    }),
  });
  console.log("VERIFY RESPONSE", verifyData);

  if (!verifyData.success) {
    return {
      success: false,
      error:
        verifyData?.message ||
        verifyData?.error ||
        "Payment verification failed",
    };
  }

  return { success: true };
};

export const initiateRazorpay = async (
  bookingId: string,
  user: any,
  parkingName: string,
  paymentMethod: PaymentMethod
) => {
  try {
    const order = await requestJson<any>("/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    console.log("ORDER RESPONSE", order);

    if (!order || !order.id || !order.amount) {
      throw new Error("Invalid order from backend");
    }

    // When backend falls back to a mock order, complete the payment flow
    // without trying to open the real gateway with a fake order id.
    if (order.mock) {
      return verifyPayment({
        bookingId,
        razorpay_order_id: order.id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: "mock_web_signature",
      });
    }

    const options = {
      description: `Parking at ${parkingName}`,
      currency: "INR",
      key: RAZORPAY_KEY,
      amount: order.amount,
      name: "SmartPark AI",
      order_id: order.id,
      prefill: {
        email: user?.email || "test@example.com",
        contact: formatRazorpayContact(user?.phone),
        name: user?.name || "User",
        method: paymentMethod,
      },
      notes: {
        bookingId,
        paymentMethod,
      },
      theme: { color: "#667eea" },
    };

    console.log("OPENING RAZORPAY", options);

    const paymentData = await RazorpayCheckout.open(options);
    console.log("PAYMENT SUCCESS", paymentData);

    return verifyPayment({
      bookingId,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    });
  } catch (error: any) {
    console.log("FULL RAZORPAY ERROR", error);
    return {
      success: false,
      error:
        error?.description ||
        error?.error?.description ||
        error?.message ||
        "Payment failed",
    };
  }
};

export const saveBookingToDB = async (payload: any) => {
  try {
    console.log("BOOKING PAYLOAD", payload);

    const data = await requestJson<any>("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("BOOKING RESPONSE", data);

    return data;
  } catch (error) {
    console.log("BOOKING ERROR", error);
    throw error;
  }
};

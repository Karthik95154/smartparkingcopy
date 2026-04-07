import RazorpayCheckout from "react-native-razorpay";

const BACKEND_URL = "http://10.132.8.33:5000";

//  MUST MATCH BACKEND KEY
const RAZORPAY_KEY = "rzp_test_SYvFiZFRu1TNNt";

/* ================= PAYMENT ================= */
export const initiateRazorpay = async (
  bookingId: string,
  user: any,
  parkingName: string
) => {
  try {
    //  1. Create order from backend
    const orderRes = await fetch(`${BACKEND_URL}/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const order = await orderRes.json();

    console.log("ORDER RESPONSE 👉", order);

    //  safer validation
    if (!order || !order.id || !order.amount) {
      throw new Error("Invalid order from backend");
    }

    //  2. Open Razorpay
    const options = {
      description: `Parking at ${parkingName}`,
      currency: "INR",
      key: RAZORPAY_KEY,
      amount: order.amount,
      name: "SmartPark AI",
      order_id: order.id, //  VERY IMPORTANT
      prefill: {
        email: user?.email || "test@example.com",
        contact: user?.phone || "9999999999",
        name: user?.name || "User",
      },
      theme: { color: "#667eea" },
    };

    console.log("OPENING RAZORPAY 👉", options);

    const paymentData = await RazorpayCheckout.open(options);

    console.log("PAYMENT SUCCESS 👉", paymentData);

    //  3. Verify payment
    const verifyRes = await fetch(`${BACKEND_URL}/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        bookingId,
      }),
    });

    const verifyData = await verifyRes.json();

    console.log("VERIFY RESPONSE 👉", verifyData);

    if (verifyData.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: "Payment verification failed",
      };
    }

  } catch (error: any) {
    console.log("🔥 FULL RAZORPAY ERROR 👉", error);

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

/* ================= BOOKING ================= */
export const saveBookingToDB = async (payload: any) => {
  try {
    console.log("BOOKING PAYLOAD 👉", payload);

    const res = await fetch(`${BACKEND_URL}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("BOOKING RESPONSE 👉", data);

    return data;
  } catch (error) {
    console.log("BOOKING ERROR 👉", error);
    throw error;
  }
};
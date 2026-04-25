export default {
  open: (options: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if ((window as any).Razorpay) {
        openRazorpay((window as any).Razorpay, options, resolve, reject);
        return;
      }

      // Dynamically load the Razorpay web script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        openRazorpay((window as any).Razorpay, options, resolve, reject);
      };
      script.onerror = () => {
        reject(new Error("Failed to load Razorpay SDK"));
      };
      document.body.appendChild(script);
    });
  },
};

const openRazorpay = (RazorpayClass: any, options: any, resolve: any, reject: any) => {
  const rzpOptions = {
    ...options,
    handler: function (response: any) {
      resolve({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: function () {
        reject(new Error("Payment cancelled by user"));
      },
    },
  };

  try {
    const rzp = new RazorpayClass(rzpOptions);
    rzp.on("payment.failed", function (response: any) {
      reject(new Error(response.error.description || "Payment failed"));
    });
    rzp.open();
  } catch (err) {
    reject(err);
  }
};

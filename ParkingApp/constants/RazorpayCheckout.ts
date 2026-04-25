import { NativeModules } from "react-native";

// Expo Go does not compile custom native modules.
// If Razorpay is missing from NativeModules, we know we are in Expo Go
// or an environment where the native code hasn't been linked/built.
const isNativeRazorpayAvailable = !!(NativeModules.RazorpayEventEmitter || NativeModules.RNRazorpay);

export default {
  open: async (options: any) => {
    if (!isNativeRazorpayAvailable) {
      throw new Error(
        "Razorpay requires a development or production build. Expo Go cannot open the real payment gateway."
      );
    }

    const RazorpayCheckout = require("react-native-razorpay").default;
    return RazorpayCheckout.open(options);
  }
};

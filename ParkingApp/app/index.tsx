import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      
      {/* TOP CONTENT */}
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/ParkScope parking ap.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>Smart Parking</Text>
        <Text style={styles.subtitle}>
          Find & Book Parking Easily
        </Text>
      </View>

      {/* BUTTONS */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupBtn}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB", // softer background
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  content: {
    alignItems: "center",
    marginTop: 20,
  },

  image: {
    width: 400,
    height: 350,
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827", // dark modern color
    letterSpacing: 1,
    
  },

  subtitle: {
    fontSize: 16,
    color: "#6B7280", // soft gray
    marginTop: 5,
    textAlign: "center",
  },

  buttonContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 90,
  },

  loginBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    width: "85%",
    alignItems: "center",
    marginBottom: 12,

    //shadow (premium feel)
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  signupBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    width: "85%",
    alignItems: "center",

    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
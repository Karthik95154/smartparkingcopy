import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, requestJson } from "../constants/api";

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (emailValue: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const validatePhone = (phoneValue: string) => /^[6-9]\d{9}$/.test(phoneValue);

  const handleSignup = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert("Missing Fields", "Please fill in all details.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert(
        "Invalid Phone",
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (password.length < 4) {
      Alert.alert("Weak Password", "Password must be at least 4 characters.");
      return;
    }

    setLoading(true);

    try {
    const data = await requestJson<any>("/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, phone, password }),
});

      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      Alert.alert("Welcome!", "Account created successfully.");
      router.replace("/(tabs)");
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert("Signup Failed", error.message || "Something went wrong.");
      } else {
        Alert.alert("Connection Error", "Check your server status.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#F8FAFC", "#FFFFFF"]} style={styles.outer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="person-add-outline" size={40} color="#2563EB" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join ParkScope for easy parking
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#94A3B8"
                style={styles.icon}
              />
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#94A3B8"
                style={styles.icon}
              />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color="#94A3B8"
                style={styles.icon}
              />
              <TextInput
                placeholder="9876543210"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#94A3B8"
                style={styles.icon}
              />
              <TextInput
                placeholder="Min. 4 characters"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={styles.footer}
          >
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  flex: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#EFF6FF",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  label: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#191c21",
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: "#1E293B",
    fontSize: 15,
  },
  eyeIcon: { padding: 4 },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 10,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: "#64748B",
    fontSize: 15,
  },
  linkBold: {
    color: "#2563EB",
    fontWeight: "700",
  },
});

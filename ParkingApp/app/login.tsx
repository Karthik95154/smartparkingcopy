import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Palette } from "../constants/theme";

import { BACKEND_URL as API_URL } from "../constants/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [checkingServer, setCheckingServer] = useState(true);

  // Pre-warm the server when app starts
  useEffect(() => {
    const warmupServer = async () => {
      try {
        setCheckingServer(true);
        console.log("Waking up server...");
        
        // Try multiple endpoints to wake up the server
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        await fetch(`${API_URL}/health`, {
          method: "HEAD",
          signal: controller.signal,
        }).catch(() => {
          // Ignore error, just trying to wake the server
        });
        
        clearTimeout(timeoutId);
        console.log("Server is ready");
      } catch {
        console.log("Server warmup attempted");
      } finally {
        setCheckingServer(false);
      }
    };
    
    warmupServer();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    setLoadingMessage("Connecting to server...");

    // Update loading message after delays
    const timeout1 = setTimeout(() => {
      if (loading) setLoadingMessage("Server is waking up... (may take 20-30 seconds)");
    }, 5000);
    
    const timeout2 = setTimeout(() => {
      if (loading) setLoadingMessage("Still connecting... Please wait");
    }, 15000);
    
    const timeout3 = setTimeout(() => {
      if (loading) setLoadingMessage("Almost there... Completing login");
    }, 25000);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log("LOGIN REQUEST:", { email: normalizedEmail, password: "***" });
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password
        })
      });

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);

      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);

      if (!response.ok) {
        Alert.alert("Login Failed", data.message || "Invalid email or password.", [
          { text: "Try Again", style: "cancel", onPress: () => handleLogin() },
          { text: "Sign Up", onPress: () => router.push("./signup") },
        ]);
        return;
      }

      // Login successful
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      Alert.alert("Success", "Login successful!");
      router.replace("/(tabs)");
      
    } catch (error: any) {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);

      console.error("LOGIN ERROR:", error);

      if (String(error?.message || "").toLowerCase().includes("timed out")) {
        Alert.alert(
          "Connection Timeout",
          "The server is taking too long to respond. This is common with free hosting.\n\nPlease try again in a few moments.",
          [
            { text: "Retry", onPress: () => handleLogin() },
            { text: "Cancel", style: "cancel" }
          ]
        );
      } else {
        Alert.alert(
          "Connection Error",
          "Unable to reach the server. Please check:\n\n• Your internet connection\n• Server status\n\nTry again in a few moments.",
          [
            { text: "Retry", onPress: () => handleLogin() },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Show checking server status while warming up
  if (checkingServer) {
    return (
      <LinearGradient colors={Palette.gradients.dark} style={styles.outer}>
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <LinearGradient
              colors={Palette.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoIcon}
            >
              <Ionicons name="car-sport" size={44} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>ParkScope</Text>
            <Text style={styles.subtitle}>Find • Book • Park with Ease</Text>
          </View>
          <View style={styles.loadingServerContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingServerText}>Waking up server...</Text>
            <Text style={styles.loadingServerSubtext}>This may take 15-20 seconds on first launch</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Palette.gradients.dark} style={styles.outer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.headerSection}>
            <LinearGradient
              colors={Palette.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoIcon}
            >
              <Ionicons name="car-sport" size={44} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>ParkScope</Text>
            <Text style={styles.subtitle}>Find • Book • Park with Ease</Text>
          </View>

          {/* CARD */}
          <LinearGradient
            colors={["#FFFFFF", "#F8FAFC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Welcome Back</Text>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Palette.primary} />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Palette.primary} />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Palette.primary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotContainer} onPress={() => {
              Alert.alert("Reset Password", "Please contact support to reset your password.");
            }}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>{loadingMessage}</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* FOOTER */}
          <TouchableOpacity onPress={() => router.push("./signup")} style={styles.footer}>
            <Text style={styles.linkText}>
              New here? <Text style={styles.linkBold}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  card: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Palette.primary,
    marginBottom: 24,
  },
  label: {
    color: Palette.text.secondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.bg.lighter,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Palette.border,
    marginBottom: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: Palette.text.primary,
    fontSize: 15,
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    color: Palette.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: Palette.primary,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
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
    alignItems: "center",
  },
  linkText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  linkBold: {
    color: "#fff",
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingServerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingServerText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginTop: 20,
  },
  loadingServerSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});
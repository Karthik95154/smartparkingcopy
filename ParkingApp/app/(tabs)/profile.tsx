import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Palette } from "../../constants/theme";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

 useEffect(() => {
  loadUser();
  fetchStats(); 
}, []);
  
  const [stats, setStats] = useState({
  bookings: 0,
  hours: 0,
  amount: 0,
});

const fetchStats = async () => {
  try {
    const data = await AsyncStorage.getItem("user");
    if (!data) return;

    const parsed = JSON.parse(data);

    const res = await fetch(
      `http://10.132.8.33:5000/my-bookings/${parsed._id}`
    );

    if (!res.ok) return;

    const bookings = await res.json();

    let totalHours = 0;
    let totalAmount = 0;

    bookings.forEach((b: any) => {
      totalHours += Number(b?.hours || 0);
      totalAmount += Number(b?.totalAmount || 0);
    });

    setStats({
      bookings: bookings.length,
      hours: Math.round(totalHours),
      amount: Math.round(totalAmount),
    });
  } catch (err) {
    console.log(err);
  }
};

const [image, setImage] = useState<string | null>(null);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      Alert.alert("Permission Required", "Please grant camera roll access to upload a photo");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
      console.log(error);
    }
  };
  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem("user");
      if (data) {
        setUser(JSON.parse(data));
      }
    } catch (error) {
      console.log("Error loading user:", error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* GRADIENT PROFILE HEADER */}
      <LinearGradient
        colors={Palette.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
              <LinearGradient
                colors={["#E0E7FF", "#F3F4F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Image
                  source={{ uri: image || user?.profileImage || "https://via.placeholder.com/110" }}
                  style={styles.avatar}
                />
              </LinearGradient>
              <View style={styles.cameraButton}>
                <MaterialIcons name="camera-alt" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.avatarBadge}>
              <MaterialIcons name="verified" size={20} color="#fff" />
            </View>
          </View>

          <Text style={styles.name}>{user?.name || "Guest User"}</Text>
          <Text style={styles.email}>{user?.email || "No Email"}</Text>

          {/* User Stats */}
          <View style={styles.statsContainer}>
            <StatBox label="Bookings" value={String(stats.bookings)} icon="directions-car" color={Palette.secondary} />
            <StatBox label="Hours" value={`${stats.hours}h`} icon="access-time" color={Palette.success} />
            <StatBox label="Spent" value={`₹${stats.amount}`} icon="currency-rupee" color={Palette.info} />
          </View>
        </View>
      </LinearGradient>

      {/* MENU OPTIONS */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <OptionCard
          icon="history"
          title="My Bookings"
          subtitle="View your parking history"
          onPress={() => router.push("/bookings")}
          color={Palette.info}
        />
        <OptionCard
          icon="receipt"
          title="Payment History"
          subtitle="All your transactions"
          onPress={() => alert("Coming Soon")}
          color={Palette.success}
        />
        <OptionCard
          icon="edit"
          title="Edit Profile"
          subtitle="Update your information"
          onPress={() => alert("Coming Soon")}
          color={Palette.warning}
        />
      </View>

      {/* SETTINGS */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <OptionCard
          icon="notifications"
          title="Notifications"
          subtitle="Manage your alerts"
          onPress={() => alert("Coming Soon")}
          color={Palette.secondary}
        />
        <OptionCard
          icon="help-circle"
          title="Help & Support"
          subtitle="Get help or report issues"
          onPress={() => alert("Coming Soon")}
          color={Palette.info}
        />
      </View>

      {/* LOGOUT BUTTON */}
      <LinearGradient
        colors={[Palette.danger, Palette.danger + "80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoutButton}
      >
        <TouchableOpacity 
          onPress={handleLogout}
          activeOpacity={0.8}
          style={styles.logoutContent}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout from ParkScope</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface OptionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}

function OptionCard({ icon, title, subtitle, onPress, color }: OptionCardProps) {
  return (
    <TouchableOpacity 
      style={styles.optionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={Palette.border} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.bg.lighter,
  },

  headerGradient: {
    paddingTop: 20,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  header: {
    alignItems: "center",
    paddingHorizontal: 20,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },

  avatarGradient: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: "#fff",
  },

  cameraButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: Palette.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Palette.success,
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },

  email: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 28,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },

  statBox: {
    alignItems: "center",
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },

  menuSection: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.text.tertiary,
    marginBottom: 12,
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.text.primary,
    marginBottom: 4,
  },

  optionSubtitle: {
    fontSize: 13,
    color: Palette.text.secondary,
  },

  logoutButton: {
    marginTop: 32,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Palette.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  logoutContent: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
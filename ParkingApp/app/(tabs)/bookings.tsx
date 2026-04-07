import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Palette } from "../../constants/theme";
import { useRouter } from "expo-router";

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBookings();
  }, []);

  //  Format date
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " • " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const fetchBookings = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      if (!user) return;

      const parsedUser = JSON.parse(user);

      const res = await fetch(
        `http://10.132.8.33:5000/my-bookings/${parsedUser._id}`
      );

      if (!res.ok) throw new Error("API Error");

      const data = await res.json();
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
    } catch (err) {
      console.log("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <LinearGradient
      colors={["#FFFFFF", Palette.bg.lighter]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* DATE */}
      <View style={styles.dateChip}>
        <Ionicons name="calendar-outline" size={12} color={Palette.primary} />
        <Text style={styles.dateText}>
          {formatDateTime(item?.date)} 
        </Text>
      </View>

      {/* MAIN */}
      <View style={styles.cardMain}>
        <View style={styles.leftCol}>
          <LinearGradient
            colors={Palette.gradients.primary}
            style={styles.iconCircle}
          >
            <Ionicons name="location-outline" size={20} color="#fff" />
          </LinearGradient>

          <View>
            <Text style={styles.parkingName}>
              {item?.parkingName || "Parking"}
            </Text>

            {/* VEHICLE */}
            <View style={styles.vehicleTag}>
              <Ionicons name="car-outline" size={12} color={Palette.info} />
              <Text style={styles.vehicleText}>
                {Array.isArray(item?.vehicleNumber)
                  ? item.vehicleNumber.join(", ")
                  : item?.vehicleNumber || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* STATUS */}
        <LinearGradient
          colors={
            item?.paymentStatus === "Paid"
              ? ["#DCFCE7", "#BBFBEE"]
              : ["#FEE2E2", "#FECACA"]
          }
          style={styles.badge}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  item?.paymentStatus === "Paid"
                    ? Palette.success
                    : Palette.danger,
              },
            ]}
          >
            {item?.paymentStatus === "Paid" ? "✓ Paid" : "⏳ Pending"} 
          </Text>
        </LinearGradient>
      </View>

      {/* STATS */}
      <View style={styles.statsContainer}>
        {/* DURATION */}
        <View style={styles.statBox}>
          <View style={styles.statIcon}>
            <Ionicons name="time-outline" size={16} color={Palette.secondary} />
          </View>
          <Text style={styles.statLabel}>DURATION</Text>
          <Text style={styles.statValue}>
            {item?.hours
              ? `${Number(item.hours).toFixed(1)} hrs`
              : "N/A"}
          </Text>
        </View>

        <View style={styles.statDivider} />

        {/* AMOUNT */}
        <View style={styles.statBox}>
          <View style={styles.statIcon}>
            <Ionicons name="cash-outline" size={16} color={Palette.success} />
          </View>
          <Text style={styles.statLabel}>AMOUNT</Text>
          <Text style={[styles.statValue, { color: Palette.success }]}>
            ₹{item?.totalAmount
              ? Number(item.totalAmount).toFixed(0)
              : "0"} 
          </Text>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.cardFooter}>
        <Text style={styles.footerId}>
          ID: {(item?._id || "").slice(-8).toUpperCase()}
        </Text>

        <TouchableOpacity
  style={styles.detailsBtn}
  onPress={() =>
    router.push({
      pathname: "/ticket",
      params: {
        bookingId: item._id,
        parkingName: item.parkingName,
        vehicleNumber: item.vehicleNumber,
        date: item.date,
        time: new Date(item.date).toLocaleTimeString(),
        hours: item.hours,
        amount: item.totalAmount,
      },
    })
  }
>
  <Text style={styles.detailsBtnText}>Receipt</Text>
  <Ionicons name="chevron-forward-outline" size={14} color={Palette.primary} />
</TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Palette.gradients.dark} style={styles.flex}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Booking History</Text>
          <Text style={styles.subtitle}>
            All your parking reservations
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Palette.primary} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="car-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Start by booking a parking spot
            </Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item, index) =>
              item?._id || index.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchBookings();
                }}
                tintColor={Palette.primary}
              />
            }
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

/* MODERN STYLES */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bg.lighter,
  },

  flex: {
    flex: 1,
  },

  headerSection: {
    padding: 24,
    paddingBottom: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
  },

  list: {
    padding: 16,
  },

  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 4,
  },

  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: Palette.primary,
  },

  cardMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  parkingName: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.text.primary,
    marginBottom: 4,
  },

  vehicleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  vehicleText: {
    fontSize: 12,
    color: Palette.text.secondary,
    fontWeight: "500",
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: Palette.bg.lighter,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  statDivider: {
    width: 1,
    backgroundColor: Palette.border,
    marginHorizontal: 8,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Palette.text.tertiary,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.text.primary,
    textAlign: "center",
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },

  footerId: {
    fontSize: 10,
    color: Palette.text.tertiary,
    fontWeight: "600",
  },

  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Palette.primary + "10",
    borderRadius: 8,
  },

  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.primary,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
});
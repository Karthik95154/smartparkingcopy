import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { Palette } from "../constants/theme";
import { buildApiUrl, getUserId } from "../constants/api";

type Booking = {
  _id?: string;
  parkingName?: string;
  vehicleNumber?: string | string[];
  spotLabel?: string;
  startTime?: string;
  date?: string;
  hours?: number | string;
  totalAmount?: number | string;
  paymentStatus?: string;
};

const getBookingDateValue = (booking: Booking) =>
  booking.startTime || booking.date || "";

const formatDateTime = (dateString?: string) => {
  if (!dateString) {
    return "Recently created";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently created";
  }

  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} at ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};

const formatHours = (hours?: number | string) => {
  if (hours === undefined || hours === null || hours === "") {
    return "Not set";
  }

  return `${Number(hours).toFixed(1)} hr`;
};

const formatAmount = (amount?: number | string) => {
  if (amount === undefined || amount === null || amount === "") {
    return "Rs. 0";
  }

  return `Rs. ${Number(amount).toFixed(0)}`;
};

const getStatusMeta = (paymentStatus?: string) => {
  const isPaid = paymentStatus === "Paid";

  return {
    isPaid,
    label: isPaid ? "Paid" : "Pending",
    icon: isPaid ? "checkmark-circle" : "time-outline",
    pillColor: isPaid ? "#DCFCE7" : "#FEF3C7",
    pillTextColor: isPaid ? Palette.success : "#B45309",
    actionLabel: isPaid ? "Open ticket" : "Payment pending",
  };
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const user = await AsyncStorage.getItem("user");

      if (!user) {
        setBookings([]);
        return;
      }

      const parsedUser = JSON.parse(user);
      const userId = getUserId(parsedUser);
      if (!userId) {
        setBookings([]);
        return;
      }

      const res = await fetch(buildApiUrl(`/my-bookings/${userId}`));

      if (!res.ok) {
        throw new Error("API Error");
      }

      const data = await res.json();
      const bookingList = Array.isArray(data) ? data : data?.bookings || [];

      bookingList.sort((a: Booking, b: Booking) => {
        const firstTime = new Date(getBookingDateValue(a)).getTime() || 0;
        const secondTime = new Date(getBookingDateValue(b)).getTime() || 0;
        return secondTime - firstTime;
      });

      setBookings(bookingList);
    } catch (err) {
      console.log("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalBookings = bookings.length;
  const paidBookings = bookings.filter(
    (booking) => booking.paymentStatus === "Paid"
  ).length;
  const pendingBookings = totalBookings - paidBookings;

  const openTicket = (item: Booking) => {
    if (item.paymentStatus !== "Paid") {
      Alert.alert(
        "Payment Pending",
        "Ticket QR is available only after successful payment."
      );
      return;
    }

    router.push({
      pathname: "/ticket",
      params: {
        bookingId: item._id,
        parkingName: item.parkingName,
        vehicleNumber: Array.isArray(item.vehicleNumber)
          ? item.vehicleNumber.join(", ")
          : item.vehicleNumber || "No vehicle data available",
        spotLabel: item.spotLabel,
        date: getBookingDateValue(item),
        time: getBookingDateValue(item),
        hours: String(item.hours ?? ""),
        amount: String(item.totalAmount ?? ""),
        paymentStatus: item.paymentStatus,
      },
    });
  };

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#334155"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.eyebrow}>Booking overview</Text>
        <Text style={styles.title}>Your parking passes</Text>
        <Text style={styles.subtitle}>
          One clean screen with the important details only.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{totalBookings}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{paidBookings}</Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{pendingBookings}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent bookings</Text>
        <Text style={styles.sectionCaption}>
          Less clutter, better readability.
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Booking }) => {
    const status = getStatusMeta(item.paymentStatus);
    const vehicleNumber = Array.isArray(item.vehicleNumber)
      ? item.vehicleNumber.join(", ")
      : item.vehicleNumber || "No vehicle data available";

    return (
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.dateBadge}>
            <Ionicons
              name="calendar-clear-outline"
              size={14}
              color={Palette.primary}
            />
            <Text style={styles.dateBadgeText}>
              {formatDateTime(getBookingDateValue(item))}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: status.pillColor },
            ]}
          >
            <Ionicons
              name={status.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={status.pillTextColor}
            />
            <Text
              style={[
                styles.statusText,
                { color: status.pillTextColor },
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.parkingName}>{item.parkingName || "Parking"}</Text>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Ionicons name="car-sport-outline" size={16} color={Palette.info} />
            <Text style={styles.metaText} numberOfLines={1}>
              {vehicleNumber}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="grid-outline"
              size={16}
              color={item.spotLabel ? Palette.primary : Palette.text.tertiary}
            />
            <Text
              style={[
                styles.metaText,
                !item.spotLabel && styles.metaTextMuted,
              ]}
              numberOfLines={1}
            >
              {item.spotLabel ? `Spot ${item.spotLabel}` : "Spot assigned later"}
            </Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatHours(item.hours)}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={[styles.infoValue, styles.amountValue]}>
              {formatAmount(item.totalAmount)}
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Ticket ID</Text>
            <Text style={styles.infoValue}>
              {(item._id || "NA").slice(-6).toUpperCase()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.actionButton,
            !status.isPaid && styles.actionButtonDisabled,
          ]}
          onPress={() => openTicket(item)}
        >
          <Text
            style={[
              styles.actionButtonText,
              !status.isPaid && styles.actionButtonTextDisabled,
            ]}
          >
            {status.actionLabel}
          </Text>
          <Ionicons
            name={status.isPaid ? "arrow-forward" : "lock-closed-outline"}
            size={16}
            color={status.isPaid ? "#FFFFFF" : Palette.text.tertiary}
          />
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#334155"]}
          style={styles.loadingScreen}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingTitle}>Loading your bookings</Text>
          <Text style={styles.loadingSubtitle}>
            Pulling together your latest parking history.
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={bookings}
        keyExtractor={(item, index) => item?._id || index.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <LinearGradient
              colors={["#E2E8F0", "#F8FAFC"]}
              style={styles.emptyIconWrap}
            >
              <Ionicons name="car-outline" size={28} color={Palette.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              Once you reserve a parking spot, it will appear here in a cleaner
              list.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },

  listContent: {
    paddingBottom: 28,
  },

  headerWrap: {
    marginBottom: 8,
  },

  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.68)",
  },

  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.82)",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  summaryTile: {
    flex: 1,
    alignItems: "center",
  },

  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.70)",
  },

  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  sectionCaption: {
    marginTop: 4,
    fontSize: 13,
    color: Palette.text.secondary,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  dateBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },

  dateBadgeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Palette.primary,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  parkingName: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  metaList: {
    marginTop: 14,
    gap: 10,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  metaText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Palette.text.secondary,
  },

  metaTextMuted: {
    color: Palette.text.tertiary,
  },

  infoStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoBlock: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Palette.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  infoValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  amountValue: {
    color: Palette.success,
  },

  actionButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Palette.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  actionButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  actionButtonTextDisabled: {
    color: Palette.text.tertiary,
  },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: Palette.text.secondary,
    textAlign: "center",
  },
});

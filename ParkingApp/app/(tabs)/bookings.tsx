import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Palette } from "../../constants/theme";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getUserId, requestJson } from "../../constants/api";

type BookingItem = {
  _id?: string;
  id?: string;
  parkingName?: string;
  vehicleNumber?: string;
  spotLabel?: string;
  slotNumber?: number;
  allocatedSlotName?: string;
  startTime?: string;
  date?: string;
  hours?: number;
  totalAmount?: number;
  paymentStatus?: string;
  bookingStatus?: string;
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBookingId, setActionBookingId] = useState("");
  const router = useRouter();

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " | " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const fetchBookings = useCallback(async () => {
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

      const data = await requestJson<any>(`/my-bookings/${userId}`);
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
    } catch (err) {
      console.log("Fetch Error:", err);
      Alert.alert("Unable to load bookings", "Please try again in a moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleBookingAction = async (
    booking: BookingItem,
    action: "check-in" | "check-out"
  ) => {
    const bookingId = booking.id || booking._id;
    if (!bookingId) {
      return;
    }

    try {
      setActionBookingId(bookingId);

      const data = await requestJson<any>(`/${action}/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      Alert.alert(
        action === "check-in" ? "Checked in" : "Checked out",
        data?.message || "Booking updated successfully."
      );

      await fetchBookings();
    } catch (error: any) {
      Alert.alert(
        "Action failed",
        error?.message || "Unable to update this booking right now."
      );
    } finally {
      setActionBookingId("");
    }
  };

  const renderItem = ({ item }: { item: BookingItem }) => {
    const bookingId = item.id || item._id || "";
    const isPaid = item.paymentStatus === "Paid";
    const bookingStatus = item.bookingStatus || "Confirmed";
    const showReceipt = isPaid;
    const canCheckIn = isPaid && bookingStatus === "Confirmed";
    const canCheckOut = bookingStatus === "Checked-In";
    const activeAction = actionBookingId === bookingId;
    const slotLabel =
      item.allocatedSlotName ||
      (item.slotNumber ? `Slot ${item.slotNumber}` : "") ||
      item.spotLabel ||
      "";

    return (
      <LinearGradient
        colors={["#FFFFFF", Palette.bg.lighter]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.dateChip}>
          <Ionicons name="calendar-outline" size={12} color={Palette.primary} />
          <Text style={styles.dateText}>
            {formatDateTime(item.startTime || item.date)}
          </Text>
        </View>

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
                {item.parkingName || "Parking"}
              </Text>

              <View style={styles.vehicleTag}>
                <Ionicons name="car-outline" size={12} color={Palette.info} />
                <Text style={styles.vehicleText}>
                  {item.vehicleNumber || "N/A"}
                </Text>
              </View>

              {!!slotLabel && (
                <View style={styles.spotTag}>
                  <Ionicons
                    name="grid-outline"
                    size={12}
                    color={Palette.primary}
                  />
                  <Text style={styles.spotText}>{slotLabel}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.badgeStack}>
            <LinearGradient
              colors={isPaid ? ["#DCFCE7", "#BBFBEE"] : ["#FEE2E2", "#FECACA"]}
              style={styles.badge}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isPaid ? Palette.success : Palette.danger },
                ]}
              >
                {isPaid ? "Paid" : "Pending"}
              </Text>
            </LinearGradient>

            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{bookingStatus}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <View style={styles.statIcon}>
              <Ionicons name="time-outline" size={16} color={Palette.secondary} />
            </View>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>
              {item.hours ? `${Number(item.hours).toFixed(1)} hrs` : "N/A"}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIcon}>
              <Ionicons name="cash-outline" size={16} color={Palette.success} />
            </View>
            <Text style={styles.statLabel}>AMOUNT</Text>
            <Text style={[styles.statValue, { color: Palette.success }]}>
              Rs {item.totalAmount ? Number(item.totalAmount).toFixed(0) : "0"}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerId}>
            ID: {String(bookingId).slice(-8).toUpperCase()}
          </Text>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[
                styles.detailsBtn,
                !showReceipt && styles.detailsBtnDisabled,
              ]}
              onPress={() => {
                if (!showReceipt) {
                  Alert.alert(
                    "Payment Pending",
                    "Ticket QR is available only after successful payment."
                  );
                  return;
                }

                router.push({
                  pathname: "/ticket",
                  params: {
                    bookingId,
                    parkingName: item.parkingName,
                    vehicleNumber: item.vehicleNumber,
                    spotLabel: item.spotLabel,
                    date: item.startTime || item.date,
                    time: item.startTime || item.date,
                    hours: item.hours?.toString() || "",
                    amount: item.totalAmount?.toString() || "",
                    paymentStatus: item.paymentStatus,
                  },
                });
              }}
            >
              <Text
                style={[
                  styles.detailsBtnText,
                  !showReceipt && styles.detailsBtnTextDisabled,
                ]}
              >
                {showReceipt ? "Receipt" : "Pending"}
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={14}
                color={
                  showReceipt ? Palette.primary : Palette.text.tertiary
                }
              />
            </TouchableOpacity>

            {(canCheckIn || canCheckOut) && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  handleBookingAction(
                    item,
                    canCheckOut ? "check-out" : "check-in"
                  )
                }
                disabled={activeAction}
              >
                {activeAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {canCheckOut ? "Check Out" : "Check In"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Palette.gradients.dark} style={styles.flex}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Booking History</Text>
          <Text style={styles.subtitle}>All your parking reservations</Text>
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
              String(item.id || item._id || index)
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

  spotTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Palette.primary + "12",
  },

  spotText: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: "700",
  },

  badgeStack: {
    alignItems: "flex-end",
    gap: 8,
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

  statusPill: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusPillText: {
    fontSize: 11,
    color: Palette.text.secondary,
    fontWeight: "700",
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
    gap: 12,
  },

  footerId: {
    fontSize: 10,
    color: Palette.text.tertiary,
    fontWeight: "600",
    flex: 1,
  },

  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  detailsBtnDisabled: {
    opacity: 0.55,
  },

  detailsBtnTextDisabled: {
    color: Palette.text.tertiary,
  },

  actionBtn: {
    minWidth: 92,
    backgroundColor: Palette.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
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

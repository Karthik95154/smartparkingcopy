import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { requestJson } from "../constants/api";

type BookingResponse = {
  id?: string;
  _id?: string;
  parkingName?: string;
  vehicleNumber?: string;
  spotLabel?: string;
  allocatedSlotName?: string;
  slotNumber?: number;
  startTime?: string;
  endTime?: string;
  hours?: number;
  totalAmount?: number;
  paymentStatus?: string;
  bookingStatus?: string;
};

export default function TicketScreen() {
  const params = useLocalSearchParams();
  const bookingId = Array.isArray(params.bookingId)
    ? params.bookingId[0]
    : params.bookingId;

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [actionLoading, setActionLoading] = useState(false);

  const getSafeDate = (dateParam: any): Date | null => {
    if (!dateParam) return null;
    const dateString = Array.isArray(dateParam) ? dateParam[0] : dateParam;
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (dateParam: any): string => {
    const date = getSafeDate(dateParam);
    if (!date) return "N/A";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateParam: any): string => {
    const date = getSafeDate(dateParam);
    if (!date) return "N/A";
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await requestJson<BookingResponse>(`/booking/${bookingId}`);
      setBooking(data);
    } catch (error) {
      console.log("Ticket fetch error:", error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleBookingAction = async (action: "check-in" | "check-out") => {
    if (!bookingId) {
      return;
    }

    try {
      setActionLoading(true);
      const data = await requestJson<any>(`/${action}/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      Alert.alert(
        action === "check-in" ? "Checked in" : "Checked out",
        data?.message || "Booking updated successfully."
      );

      await fetchBooking();
    } catch (error: any) {
      Alert.alert(
        "Action failed",
        error?.message || "Unable to update this booking right now."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resolvedBooking = {
    bookingId,
    parkingName: booking?.parkingName || params.parkingName,
    vehicleNumber: booking?.vehicleNumber || params.vehicleNumber,
    spotLabel:
      booking?.allocatedSlotName ||
      (booking?.slotNumber ? `Slot ${booking.slotNumber}` : "") ||
      booking?.spotLabel ||
      params.spotLabel,
    startTime: booking?.startTime || params.date,
    hours:
      booking?.hours != null
        ? String(booking.hours)
        : Array.isArray(params.hours)
          ? params.hours[0]
          : params.hours,
    totalAmount:
      booking?.totalAmount != null
        ? String(booking.totalAmount)
        : Array.isArray(params.amount)
          ? params.amount[0]
          : params.amount,
    paymentStatus: booking?.paymentStatus || params.paymentStatus,
    bookingStatus: booking?.bookingStatus || "Confirmed",
  };

  const isPaid = resolvedBooking.paymentStatus === "Paid";
  const canCheckIn = isPaid && resolvedBooking.bookingStatus === "Confirmed";
  const canCheckOut = resolvedBooking.bookingStatus === "Checked-In";

  const qrData = isPaid
    ? JSON.stringify({
        bookingId: resolvedBooking.bookingId,
        parking: resolvedBooking.parkingName,
        vehicle: resolvedBooking.vehicleNumber,
        spot: resolvedBooking.spotLabel,
        time: formatTime(resolvedBooking.startTime),
        paymentStatus: "Paid",
      })
    : "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.ticket}>
        <Text style={styles.title}>Parking E-Ticket</Text>
        <Text style={styles.subtitle}>
          {isPaid
            ? "Show this at entry gate after payment verification."
            : "Ticket will unlock after payment."}
        </Text>

        {loading ? (
          <View style={styles.pendingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.pendingText}>Loading booking details...</Text>
          </View>
        ) : isPaid ? (
          <View style={styles.qrContainer}>
            <QRCode value={qrData} size={180} />
          </View>
        ) : (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Payment Pending</Text>
            <Text style={styles.pendingText}>
              QR code is generated only after successful payment verification.
            </Text>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Booking ID</Text>
            <Text style={styles.value}>{resolvedBooking.bookingId || "N/A"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Parking</Text>
            <Text style={styles.value}>{resolvedBooking.parkingName || "N/A"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Vehicle</Text>
            <Text style={styles.value}>
              {resolvedBooking.vehicleNumber || "N/A"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Slot</Text>
            <Text style={styles.value}>{resolvedBooking.spotLabel || "N/A"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(resolvedBooking.startTime)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{formatTime(resolvedBooking.startTime)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{resolvedBooking.hours || "N/A"} hrs</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Booking Status</Text>
            <Text style={styles.value}>{resolvedBooking.bookingStatus}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>
            {isPaid ? "Amount Paid" : "Amount to Pay"}
          </Text>
          <Text style={styles.amount}>Rs {resolvedBooking.totalAmount || "0"}</Text>
        </View>

        <Text style={[styles.success, !isPaid && styles.pendingStatus]}>
          {isPaid ? "Payment Successful" : "Payment Pending"}
        </Text>

        {(canCheckIn || canCheckOut) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              handleBookingAction(canCheckOut ? "check-out" : "check-in")
            }
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                {canCheckOut ? "Check Out and Free Slot" : "Check In"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  ticket: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 10,
  },

  qrContainer: {
    alignItems: "center",
    marginVertical: 20,
  },

  pendingBox: {
    marginVertical: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    gap: 10,
  },

  pendingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 6,
  },

  pendingText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },

  details: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 16,
  },

  label: {
    fontSize: 13,
    color: "#64748B",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    flexShrink: 1,
    textAlign: "right",
  },

  amountBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
  },

  amountLabel: {
    fontSize: 12,
    color: "#64748B",
  },

  amount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#22C55E",
  },

  success: {
    marginTop: 15,
    textAlign: "center",
    color: "#16A34A",
    fontWeight: "bold",
    fontSize: 15,
  },

  pendingStatus: {
    color: "#EA580C",
  },

  actionButton: {
    marginTop: 18,
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

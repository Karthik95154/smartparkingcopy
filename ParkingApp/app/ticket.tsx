import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";

export default function TicketScreen() {
  const params = useLocalSearchParams();

  //  SAFE DATE PARSER
  const getSafeDate = (dateParam: any): Date | null => {
    if (!dateParam) return null;

    const dateString = Array.isArray(dateParam)
      ? dateParam[0]
      : dateParam;

    const parsed = new Date(dateString);

    return isNaN(parsed.getTime()) ? null : parsed;
  };

  //  FORMAT DATE
  const formatDate = (dateParam: any): string => {
    const date = getSafeDate(dateParam);
    if (!date) return "N/A";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  //  FORMAT TIME
  const formatTime = (dateParam: any): string => {
    const date = getSafeDate(dateParam);
    if (!date) return "N/A";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // 🔳 QR DATA
  const qrData = JSON.stringify({
    bookingId: params.bookingId,
    parking: params.parkingName,
    vehicle: params.vehicleNumber,
    time: params.time,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.ticket}>

        {/* HEADER */}
        <Text style={styles.title}>🎟️ Parking E-Ticket</Text>
        <Text style={styles.subtitle}>Show this at entry gate</Text>

        {/* QR */}
        <View style={styles.qrContainer}>
          <QRCode value={qrData} size={180} />
        </View>

        {/* DETAILS */}
        <View style={styles.details}>

          <View style={styles.row}>
            <Text style={styles.label}>Booking ID</Text>
            <Text style={styles.value}>{params.bookingId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Parking</Text>
            <Text style={styles.value}>{params.parkingName}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Vehicle</Text>
            <Text style={styles.value}>{params.vehicleNumber}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(params.date)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{formatTime(params.date)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{params.hours} hrs</Text>
          </View>

        </View>

        {/* AMOUNT */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amount}>₹{params.amount}</Text>
        </View>

        {/* STATUS */}
        <Text style={styles.success}>Payment Successful</Text>

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
  },

  label: {
    fontSize: 13,
    color: "#64748B",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
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
});
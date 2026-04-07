import { router, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";
import { initiateRazorpay, saveBookingToDB } from "../constants/paymentService";
import { PaymentModal } from "../components/PaymentModal";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Palette } from "../constants/theme";

const TIME_SLOT_INTERVAL_MINUTES = 30;
const TIME_SLOT_COUNT = 20;

const roundToNextQuarter = (date: Date) => {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  next.setMinutes(roundedMinutes);
  return next;
};

const buildTimeSlots = (baseTime: Date) =>
  Array.from({ length: TIME_SLOT_COUNT }, (_, index) => {
    const minutes = index * TIME_SLOT_INTERVAL_MINUTES;
    const value = new Date(baseTime.getTime() + minutes * 60 * 1000);

    return {
      minutes,
      value,
    };
  });

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  //  VEHICLES
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  //  TIME
  const [bookingBaseTime, setBookingBaseTime] = useState(() =>
    roundToNextQuarter(new Date())
  );
  const [startOffsetMinutes, setStartOffsetMinutes] = useState(0);
  const [endOffsetMinutes, setEndOffsetMinutes] = useState(60);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);

  // PAYMENT
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const slotNumber = Number(params.slots);

  // Load vehicles
  useEffect(() => {
    const loadVehicles = async () => {
      const data = await AsyncStorage.getItem("vehicles");
      if (data) setVehicles(JSON.parse(data));
    };
    loadVehicles();
  }, []);

  // ➕ Add vehicle
  const addVehicle = async () => {
    const vehicle = newVehicle.trim().toUpperCase();

    if (!vehicle) return Alert.alert("Enter vehicle number");
    if (vehicles.includes(vehicle)) return Alert.alert("Vehicle already exists");

    const updated = [...vehicles, vehicle];
    setVehicles(updated);
    await AsyncStorage.setItem("vehicles", JSON.stringify(updated));

    setSelectedVehicle(vehicle);
    setNewVehicle("");
  };

  //  Delete vehicle
  const deleteVehicle = async (v: string) => {
    const updated = vehicles.filter((item) => item !== v);
    setVehicles(updated);
    await AsyncStorage.setItem("vehicles", JSON.stringify(updated));

    if (selectedVehicle === v) setSelectedVehicle("");
  };

  //  Duration calculation (FIXED)
  const timeSlots = buildTimeSlots(bookingBaseTime);
  const startTime = new Date(
    bookingBaseTime.getTime() + startOffsetMinutes * 60 * 1000
  );
  const endTime = new Date(
    bookingBaseTime.getTime() + endOffsetMinutes * 60 * 1000
  );
  const durationMs = endTime.getTime() - startTime.getTime();
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const availableEndSlots = timeSlots.filter(
    (slot) => slot.minutes > startOffsetMinutes
  );

  const formatTime = (value: Date) =>
    value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatDateLine = (value: Date) =>
    value.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const durationLabel =
    totalMinutes <= 0 ? "Choose an end time after the start time" : `${hours}h ${minutes}m`;

 const pricePerHour = Number(params.price);
const pricePerMinute = pricePerHour / 60;

let total = 0;

if (totalMinutes <= 0) {
  total = 0;
} else if (totalMinutes <= 60) {
  //  First hour fixed
  total = pricePerHour;
} else {
  //  After 1 hour → per minute
  const extraMinutes = totalMinutes - 60;
  total = pricePerHour + extraMinutes * pricePerMinute;
}

  //  Maps
  const openMaps = () => {
    if (!params.latitude || !params.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${params.latitude},${params.longitude}`;
    Linking.openURL(url);
  };

  // Booking
  const handleBookingTrigger = () => {
    if (!selectedVehicle || durationMs <= 0) {
      return Alert.alert("Select vehicle and valid time");
    }
    setShowPaymentModal(true);
  };

  //  Payment
const processPayment = async () => {
  try {
    setIsProcessing(true);

    const userStr = await AsyncStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) return Alert.alert("Please login first");

    // STEP 1: Create booking FIRST
    const bookingRes = await saveBookingToDB({
      userId: user._id,
      userName: user.name,
      phone: user.phone,
      vehicleNumber: selectedVehicle,
      parkingId: params.id,
      parkingName: params.name,
      hours: Math.max(1, hours), 
      pricePerHour: Number(params.price),
    });

    const bookingId = bookingRes.booking._id;

    console.log("BOOKING ID 👉", bookingId);

    //  STEP 2: Payment
    const payment = await initiateRazorpay(
      bookingId,
      user,
      params.name as string
    );

    if (!payment.success) {
      return Alert.alert("Payment Failed", payment.error);
    }

    //  STEP 3: Create ticket data
    const ticketData = {
      bookingId,
      parkingName: params.name,
      vehicleNumber: selectedVehicle,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      hours: Math.max(1, hours),
      amount: Math.max(1, hours) * Number(params.price),
    };

    //  STEP 4: Navigate to ticket screen
    setShowPaymentModal(false);

    router.push({
      pathname: "/ticket",
      params: ticketData,
    });

  } catch (error: any) {
    console.log(error);
    Alert.alert("Error", error?.message || "Something went wrong");
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* GRADIENT HEADER */}
      <LinearGradient
        colors={Palette.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconBadge}>
            <Ionicons name="location" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>{params.name}</Text>
          <Text style={styles.subtitle}>Premium Parking Location</Text>
        </View>
      </LinearGradient>

      {/* INFO CARDS */}
      <View style={styles.infoRow}>
        <LinearGradient
          colors={["#F3F4F6", "#FFFFFF"]}
          style={styles.infoCard}
        >
          <View style={styles.iconSmall}>
            <Ionicons name="car-outline" size={24} color={Palette.primary} />
          </View>
          <Text style={styles.label}>Slots Available</Text>
          <Text style={styles.value}>{params.slots}</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#F3F4F6", "#FFFFFF"]}
          style={styles.infoCard}
        >
          <View style={styles.iconSmall}>
            <Ionicons name="cash-outline" size={24} color={Palette.secondary} />
          </View>
          <Text style={styles.label}>Price per Hour</Text>
          <Text style={styles.value}>₹{params.price}</Text>
        </LinearGradient>
      </View>

      {/* STATUS BADGE */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              slotNumber > 10 ? Palette.success + "20" : Palette.danger + "20",
          },
        ]}
      >
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: slotNumber > 10 ? Palette.success : Palette.danger,
            },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            {
              color: slotNumber > 10 ? Palette.success : Palette.danger,
            },
          ]}
        >
          {slotNumber > 10 ? "Available" : "Limited Slots"}
        </Text>
      </View>

      {/* VEHICLE SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="car-sport-outline" size={20} color={Palette.primary} />
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
        </View>

        {vehicles.map((v) => (
          <View key={v} style={styles.vehicleRow}>
            <TouchableOpacity
              style={[
                styles.vehicleButton,
                selectedVehicle === v && styles.vehicleButtonActive,
              ]}
              onPress={() => setSelectedVehicle(v)}
            >
              <Ionicons
                name="car"
                size={20}
                color={selectedVehicle === v ? "#fff" : Palette.primary}
              />
              <Text
                style={[
                  styles.vehicleText,
                  selectedVehicle === v && styles.vehicleTextActive,
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteVehicle(v)}
            >
              <Ionicons name="close-circle" size={24} color={Palette.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.inputWrapper}>
          <Ionicons name="add-circle-outline" size={20} color={Palette.primary} />
          <TextInput
            placeholder="Add Vehicle (e.g., KA05AB1234)"
            style={styles.input}
            value={newVehicle}
            onChangeText={setNewVehicle}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={addVehicle}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {/* TIME SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={20} color={Palette.secondary} />
          <Text style={styles.sectionTitle}>Booking Duration</Text>
        </View>

        <Text style={styles.sectionHint}>
          Select a start time and end time. The duration is calculated automatically.
        </Text>

        <View style={styles.timeOverviewRow}>
          <View style={styles.timeOverviewCard}>
            <View style={styles.timeOverviewHeader}>
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={Palette.success}
              />
              <Text style={styles.timeOverviewLabel}>Starts</Text>
            </View>
            <Text style={styles.timeOverviewValue}>{formatTime(startTime)}</Text>
            <Text style={styles.timeOverviewMeta}>{formatDateLine(startTime)}</Text>
          </View>

          <View style={styles.timeOverviewCard}>
            <View style={styles.timeOverviewHeader}>
              <Ionicons
                name="stop-circle-outline"
                size={18}
                color={Palette.danger}
              />
              <Text style={styles.timeOverviewLabel}>Ends</Text>
            </View>
            <Text style={styles.timeOverviewValue}>{formatTime(endTime)}</Text>
            <Text style={styles.timeOverviewMeta}>{formatDateLine(endTime)}</Text>
          </View>
        </View>

        <Text style={styles.timeOptionTitle}>Start Time</Text>
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowStartDropdown((prev) => !prev);
              setShowEndDropdown(false);
            }}
          >
            <View style={styles.dropdownTriggerTextWrap}>
              <Text style={styles.dropdownLabel}>Start Time</Text>
              <Text style={styles.dropdownValue}>{formatTime(startTime)}</Text>
            </View>
            <Ionicons
              name={showStartDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color={Palette.primary}
            />
          </TouchableOpacity>

          {showStartDropdown && (
            <View style={styles.dropdownMenu}>
              {timeSlots.map((slot) => {
                const selected = startOffsetMinutes === slot.minutes;

                return (
                  <TouchableOpacity
                    key={`start-${slot.minutes}`}
                    style={[
                      styles.dropdownItem,
                      selected && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setStartOffsetMinutes(slot.minutes);
                      if (endOffsetMinutes <= slot.minutes) {
                        setEndOffsetMinutes(slot.minutes + 60);
                      }
                      setShowStartDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextActive,
                      ]}
                    >
                      {formatTime(slot.value)}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Palette.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshTimeBtn}
          onPress={() => setBookingBaseTime(roundToNextQuarter(new Date()))}
        >
          <Ionicons name="refresh-outline" size={16} color={Palette.primary} />
          <Text style={styles.refreshTimeText}>Refresh current time</Text>
        </TouchableOpacity>

        <Text style={styles.timeOptionTitle}>End Time</Text>
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowEndDropdown((prev) => !prev);
              setShowStartDropdown(false);
            }}
          >
            <View style={styles.dropdownTriggerTextWrap}>
              <Text style={styles.dropdownLabel}>End Time</Text>
              <Text style={styles.dropdownValue}>{formatTime(endTime)}</Text>
            </View>
            <Ionicons
              name={showEndDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color={Palette.primary}
            />
          </TouchableOpacity>

          {showEndDropdown && (
            <View style={styles.dropdownMenu}>
              {availableEndSlots.map((slot) => {
                const selected = endOffsetMinutes === slot.minutes;

                return (
                  <TouchableOpacity
                    key={`end-${slot.minutes}`}
                    style={[
                      styles.dropdownItem,
                      selected && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setEndOffsetMinutes(slot.minutes);
                      setShowEndDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextActive,
                      ]}
                    >
                      {formatTime(slot.value)}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Palette.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View
          style={[
            styles.durationInfoCard,
            totalMinutes <= 0 && styles.durationInfoCardWarning,
          ]}
        >
          <Ionicons
            name={totalMinutes <= 0 ? "alert-circle-outline" : "hourglass-outline"}
            size={20}
            color={totalMinutes <= 0 ? Palette.danger : Palette.secondary}
          />
          <View style={styles.durationInfoTextWrap}>
            <Text style={styles.durationInfoLabel}>Calculated Duration</Text>
            <Text
              style={[
                styles.durationInfoValue,
                totalMinutes <= 0 && styles.durationInfoValueWarning,
              ]}
            >
              {durationLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* SUMMARY CARD */}
      <LinearGradient
        colors={Palette.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryTitle}>Booking Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>
            {hours}h {minutes}m
          </Text>
        </View>

        <View style={[styles.summaryRow, { marginBottom: 8 }]}>
          <Text style={styles.summaryLabel}>Parking Fee</Text>
          <Text style={styles.summaryValue}>₹{total.toFixed(0)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{total.toFixed(0)}</Text>
        </View>
      </LinearGradient>

      {/* ACTION BUTTONS */}
      <TouchableOpacity style={styles.directionsBtn} onPress={openMaps}>
        <Ionicons name="navigate-outline" size={20} color="#fff" />
        <Text style={styles.btnText}>Get Directions</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bookBtn} onPress={handleBookingTrigger}>
        <Ionicons name="checkmark-done" size={20} color="#fff" />
        <Text style={styles.btnText}>Book Now</Text>
      </TouchableOpacity>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPay={processPayment}
        amount={total}
        loading={isProcessing}
      />
    </ScrollView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.bg.lighter,
  },

  // Header Gradient
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },

  headerContent: {
    alignItems: "center",
  },

  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },

  // Info Cards Row
  infoRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },

  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  iconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    fontSize: 12,
    color: Palette.text.secondary,
    fontWeight: "500",
    marginBottom: 4,
  },

  value: {
    fontSize: 20,
    fontWeight: "700",
    color: Palette.text.primary,
  },

  // Status Badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.text.primary,
  },

  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    color: Palette.text.secondary,
    marginBottom: 14,
  },

  // Vehicle Section
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  vehicleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  vehicleButtonActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },

  vehicleText: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.text.primary,
  },

  vehicleTextActive: {
    color: "#fff",
  },

  deleteBtn: {
    padding: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.border,
    marginBottom: 12,
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: Palette.text.primary,
    padding: 12,
  },

  addBtn: {
    flexDirection: "row",
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: Palette.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  addBtnText: {
    color: "#f9f5f5",
    fontWeight: "600",
    fontSize: 14,
  },

  // Time Section
  timeOverviewRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  timeOverviewCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Palette.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  timeOverviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  timeOverviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  timeOverviewValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Palette.text.primary,
    marginBottom: 4,
  },

  timeOverviewMeta: {
    fontSize: 12,
    color: Palette.text.tertiary,
    fontWeight: "500",
  },

  timeOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },

  dropdownWrap: {
    marginBottom: 12,
  },

  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Palette.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  dropdownTriggerTextWrap: {
    flex: 1,
  },

  dropdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.text.secondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  dropdownValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  dropdownMenu: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: "hidden",
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },

  dropdownItemActive: {
    backgroundColor: Palette.primary + "10",
  },

  dropdownItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.text.primary,
  },

  dropdownItemTextActive: {
    color: Palette.primary,
  },

  refreshTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Palette.primary + "10",
    borderRadius: 10,
  },

  refreshTimeText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },

  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Palette.border,
    justifyContent: "center",
    alignItems: "center",
  },

  durationInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },

  durationInfoCardWarning: {
    backgroundColor: Palette.danger + "10",
    borderColor: Palette.danger + "35",
  },

  durationInfoTextWrap: {
    flex: 1,
  },

  durationInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.text.secondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  durationInfoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.text.primary,
  },

  durationInfoValueWarning: {
    color: Palette.danger,
  },

  // Summary Card
  summaryCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  summaryLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginVertical: 8,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },

  totalAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  // Buttons
  directionsBtn: {
    flexDirection: "row",
    backgroundColor: Palette.light,
    paddingVertical: 14,
    marginHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    shadowColor: Palette.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  bookBtn: {
    flexDirection: "row",
    backgroundColor: Palette.primary,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

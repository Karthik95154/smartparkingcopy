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
  Dimensions,
  ImageBackground,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useRef } from "react";
import {
  initiateRazorpay,
  saveBookingToDB,
  type PaymentMethod,
} from "../constants/paymentService";
import { requestJson } from "../constants/api";
import { PaymentModal } from "../components/PaymentModal";
import { TimePickerModal } from "../components/TimePickerModal";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

import {
  buildFallbackParkingLayout,
  normalizeParkingSpots,
  summarizeParkingSpots,
  type ParkingSpot,
} from "../constants/parkingLayout";

const { height } = Dimensions.get("window");

const MINIMUM_BOOKING_ADVANCE_MINUTES = 15;
const DEFAULT_BOOKING_DURATION_MINUTES = 60;
const MAX_TIME_SELECTION_MINUTES = 24 * 60 - 1;

const COLORS = {
  bg: "#0B1220",
  surface: "#121A2B",
  card: "#FFFFFF",
  cardSoft: "#F6F8FC",
  text: "#111827",
  textSoft: "#6B7280",
  textOnDark: "#F9FAFB",
  border: "#E5E7EB",
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  primarySoft: "#EDE9FE",
  success: "#10B981",
  successSoft: "#ECFDF5",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  warning: "#F59E0B",
  warningSoft: "#FFFBEB",
  shadow: "rgba(15, 23, 42, 0.08)",
};

const roundToNextMinute = (date: Date) => {
  const next = new Date(date);
  const shouldRoundUp = next.getSeconds() > 0 || next.getMilliseconds() > 0;
  next.setSeconds(0, 0);
  if (shouldRoundUp) {
    next.setMinutes(next.getMinutes() + 1);
  }
  return next;
};

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const slotNumber = Number(params.availableSlots) || Number(params.slots) || 0;
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>(() =>
    buildFallbackParkingLayout(slotNumber)
  );
  const [selectedSpotId, setSelectedSpotId] = useState("");

  useEffect(() => {
    if (!selectedSpotId && parkingSpots && parkingSpots.length > 0) {
      const available = parkingSpots.find((s) => s.status === "available") || parkingSpots[0];
      if (available) setSelectedSpotId(available.spotId);
    }
  }, [parkingSpots, selectedSpotId]);

  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [newVehicle, setNewVehicle] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const [bookingBaseTime] = useState(() =>
    roundToNextMinute(
      new Date(Date.now() + MINIMUM_BOOKING_ADVANCE_MINUTES * 60 * 1000)
    )
  );
  const [startOffsetMinutes, setStartOffsetMinutes] = useState(0);
  const [endOffsetMinutes, setEndOffsetMinutes] = useState(
    DEFAULT_BOOKING_DURATION_MINUTES
  );
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<"start" | "end">("start");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const loadVehicles = async () => {
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;

      const data = await AsyncStorage.getItem(`vehicles_${user.id || user._id}`);
      if (data) setVehicles(JSON.parse(data));
    };
    loadVehicles();
  }, []);

  useEffect(() => {
    const saveVehicles = async () => {
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || vehicles.length === 0) return;

      await AsyncStorage.setItem(`vehicles_${user.id || user._id}`, JSON.stringify(vehicles));
    };
    saveVehicles();
  }, [vehicles]);

  const startTime = new Date(
    bookingBaseTime.getTime() + startOffsetMinutes * 60 * 1000
  );
  const endTime = new Date(
    bookingBaseTime.getTime() + endOffsetMinutes * 60 * 1000
  );

  const startTimeIso = startTime.toISOString();
  const endTimeIso = endTime.toISOString();

  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const pricePerHour = Number(params.pricePerHour) || Number(params.price) || 0;
  const total =
    totalMinutes <= 60
      ? pricePerHour
      : pricePerHour + (totalMinutes - 60) * (pricePerHour / 60);

  const spotSummary = summarizeParkingSpots(parkingSpots);
  const selectedSpot = parkingSpots.find(
    (spot) => spot.spotId === selectedSpotId
  );

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: Date) =>
    date.toLocaleDateString([], { month: "short", day: "numeric" });

  useEffect(() => {
    const loadAvailability = async () => {
      if (!params.id || totalMinutes <= 0) {
        setParkingSpots(buildFallbackParkingLayout(slotNumber));
        return;
      }

      try {
        const data = await requestJson<any>(
          `/api/slots/availability?startTime=${encodeURIComponent(
            startTimeIso
          )}&endTime=${encodeURIComponent(endTimeIso)}`
        );
        setParkingSpots(normalizeParkingSpots(data, slotNumber));
      } catch {
        console.log("Using fallback layout");
      }
    };

    loadAvailability();
  }, [endTimeIso, params.id, slotNumber, startTimeIso, totalMinutes]);

  const addVehicle = async () => {
    const vehicle = newVehicle.trim().toUpperCase();
    if (!vehicle) return Alert.alert("Enter vehicle number");
    if (vehicles.includes(vehicle))
      return Alert.alert("Vehicle already exists");
    setVehicles([...vehicles, vehicle]);
    setSelectedVehicle(vehicle);
    setNewVehicle("");
    setShowAddVehicle(false);
  };

  const deleteVehicle = (vehicle: string) => {
    Alert.alert("Remove Vehicle", `Remove ${vehicle}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setVehicles(vehicles.filter((v) => v !== vehicle));
          if (selectedVehicle === vehicle) setSelectedVehicle("");
        },
      },
    ]);
  };

  const openMaps = () => {
    if (params.latitude && params.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${params.latitude},${params.longitude}`
      );
    }
  };

  const handleBooking = async () => {
    console.log("Handle Booking Triggered", { selectedSpot, selectedVehicle, totalMinutes });
    if (!selectedSpot) return Alert.alert("Select a parking spot");
    if (!selectedVehicle) return Alert.alert("Select a vehicle");
    if (totalMinutes <= 0) return Alert.alert("Select valid time slot");
    setShowPaymentModal(true);
  };

  const processPayment = async (paymentMethod: PaymentMethod) => {
    try {
      setIsProcessing(true);
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) {
        Alert.alert("Please login first");
        return;
      }

      const bookingRes = await saveBookingToDB({
        userId: user.id || user._id,
        userName: user.name,
        userEmail: user.email,
        phone: user.phone,
        vehicleNumber: selectedVehicle,
        parkingId: params.id,
        parkingName: params.name,
        spotId: selectedSpot!.spotId,
        spotLabel: selectedSpot!.label,
        hours: Math.max(1, totalMinutes / 60),
        pricePerHour,
        totalAmount: total,
        startTime: startTimeIso,
        endTime: endTimeIso,
      });

      const payment = await initiateRazorpay(
        bookingRes.booking.id || bookingRes.booking._id,
        user,
        params.name as string,
        paymentMethod
      );
      if (!payment.success) return Alert.alert("Payment Failed", payment.error);

      setShowPaymentModal(false);
      router.push({
        pathname: "/ticket",
        params: {
          bookingId: bookingRes.booking.id || bookingRes.booking._id,
          parkingName: params.name,
          vehicleNumber: selectedVehicle,
          spotLabel: selectedSpot!.label,
          date: startTimeIso,
          time: startTimeIso,
          hours: (totalMinutes / 60).toFixed(1),
          amount: total.toFixed(0),
          paymentStatus: "Paid",
        },
      });
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScroll = (event: any) => {
    scrollY.setValue(event.nativeEvent.contentOffset.y);
  };

  const openTimePicker = (type: "start" | "end") => {
    setTimePickerType(type);
    setShowTimeModal(true);
  };

  const selectTime = (minutesValue: number) => {
    if (timePickerType === "start") {
      setStartOffsetMinutes(minutesValue);
      if (endOffsetMinutes <= minutesValue) {
        setEndOffsetMinutes(
          Math.min(
            MAX_TIME_SELECTION_MINUTES,
            Math.max(
              minutesValue + 1,
              minutesValue + DEFAULT_BOOKING_DURATION_MINUTES
            )
          )
        );
      }
    } else {
      setEndOffsetMinutes(minutesValue);
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [0, 0.35, 0.92],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[styles.floatingHeader, { opacity: headerOpacity }]}
      >
        <View style={styles.floatingHeaderInner}>
          <Text numberOfLines={1} style={styles.floatingHeaderTitle}>
            {params.name}
          </Text>
          <TouchableOpacity onPress={openMaps} style={styles.iconPill}>
            <Ionicons name="navigate-outline" size={18} color={COLORS.textOnDark} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200",
            }}
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={[
                "rgba(11,18,32,0.15)",
                "rgba(11,18,32,0.72)",
                "#0B1220",
              ]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.heroTopBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.glassBtn}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={openMaps} style={styles.directionBtn}>
                <Ionicons name="location-outline" size={16} color="#fff" />
                <Text style={styles.directionBtnText}>Directions</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.heroBadgeText}>Live availability</Text>
              </View>

              <Text style={styles.heroTitle}>{params.name}</Text>
              <Text style={styles.heroSubtitle}>
                Smart slot booking with cleaner selection, faster checkout, and
                live spot visibility.
              </Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>{spotSummary.available}</Text>
                  <Text style={styles.heroStatLabel}>Free spots</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>₹{pricePerHour}</Text>
                  <Text style={styles.heroStatLabel}>Per hour</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>24/7</Text>
                  <Text style={styles.heroStatLabel}>Open</Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.content}>
            {/* Vehicle Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Your vehicle</Text>
              <Text style={styles.sectionTitle}>Select vehicle</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleRow}
              >
                {vehicles.map((vehicle) => (
                  <View
                    key={vehicle}
                    style={[
                      styles.vehicleChipWrapper,
                      selectedVehicle === vehicle && styles.vehicleChipWrapperActive,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.vehicleChip}
                      onPress={() => setSelectedVehicle(vehicle)}
                    >
                      <View
                        style={[
                          styles.vehicleIconWrap,
                          selectedVehicle === vehicle &&
                            styles.vehicleIconWrapActive,
                        ]}
                      >
                        <FontAwesome5
                          name="car"
                          size={16}
                          color={
                            selectedVehicle === vehicle
                              ? COLORS.primary
                              : COLORS.textSoft
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.vehicleChipText,
                          selectedVehicle === vehicle &&
                            styles.vehicleChipTextActive,
                        ]}
                      >
                        {vehicle}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.vehicleDeleteBtn}
                      onPress={() => deleteVehicle(vehicle)}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addVehicleChip}
                  onPress={() => setShowAddVehicle(true)}
                >
                  <Ionicons name="add" size={18} color={COLORS.primary} />
                  <Text style={styles.addVehicleChipText}>Add new</Text>
                </TouchableOpacity>
              </ScrollView>

              {showAddVehicle && (
                <View style={styles.inlineForm}>
                  <Text style={styles.inputLabel}>Vehicle number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="TS09AB1234"
                    placeholderTextColor="#9CA3AF"
                    value={newVehicle}
                    onChangeText={setNewVehicle}
                    autoCapitalize="characters"
                    autoFocus
                  />

                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => setShowAddVehicle(false)}
                    >
                      <Text style={styles.secondaryBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={addVehicle}
                    >
                      <Text style={styles.primaryBtnText}>Save Vehicle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionEyebrow}>Booking duration</Text>
              <Text style={styles.sectionTitle}>Select time</Text>

              <View style={styles.timeGrid}>
                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => openTimePicker("start")}
                >
                  <Text style={styles.timeCardLabel}>Start time</Text>
                  <Text style={styles.timeCardValue}>{formatTime(startTime)}</Text>
                  <Text style={styles.timeCardDate}>{formatDate(startTime)}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textSoft}
                    style={styles.timeChevron}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeCard}
                  onPress={() => openTimePicker("end")}
                >
                  <Text style={styles.timeCardLabel}>End time</Text>
                  <Text style={styles.timeCardValue}>{formatTime(endTime)}</Text>
                  <Text style={styles.timeCardDate}>{formatDate(endTime)}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textSoft}
                    style={styles.timeChevron}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.bookingSummary}>
                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryKey}>Duration</Text>
                  <Text style={styles.summaryMain}>
                    {hours}h {minutes}m
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryKey}>Estimated total</Text>
                  <Text style={styles.summaryPrice}>₹{total.toFixed(0)}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomBarLabel}>Total payable</Text>
          <Text style={styles.bottomBarPrice}>₹{total.toFixed(0)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, !selectedVehicle && styles.ctaButtonDisabled]}
          onPress={handleBooking}
          disabled={!selectedVehicle}
        >
          <LinearGradient
            colors={selectedVehicle ? ["#8B5CF6", "#7C3AED"] : ["#CBD5E1", "#94A3B8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Book now</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TimePickerModal
        visible={showTimeModal}
        title={`Select ${timePickerType === "start" ? "start" : "end"} time`}
        baseTime={bookingBaseTime}
        selectedOffsetMinutes={
          timePickerType === "start" ? startOffsetMinutes : endOffsetMinutes
        }
        minimumOffsetMinutes={
          timePickerType === "start" ? 0 : startOffsetMinutes + 1
        }
        maximumOffsetMinutes={
          timePickerType === "start"
            ? MAX_TIME_SELECTION_MINUTES - 1
            : MAX_TIME_SELECTION_MINUTES
        }
        onSelect={selectTime}
        onClose={() => setShowTimeModal(false)}
        formatLabel={formatTime}
        formatDate={formatDate}
      />

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPay={processPayment}
        amount={total}
        loading={isProcessing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  floatingHeaderInner: {
    backgroundColor: "rgba(11,18,32,0.86)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  floatingHeaderTitle: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },

  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  hero: {
    height: 360,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 26,
  },

  heroImage: {
    resizeMode: "cover",
  },

  heroTopBar: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  directionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },

  directionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  heroContent: {
    gap: 14,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },

  heroBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: "92%",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  heroStatValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },

  heroStatLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    fontWeight: "500",
  },

  content: {
    backgroundColor: "#F3F6FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },

  sectionEyebrow: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontWeight: "600",
    marginBottom: 4,
  },

  vehicleRow: {
    paddingTop: 4,
    paddingBottom: 6,
    paddingRight: 8,
    gap: 10,
  },

  vehicleChipWrapper: {
    position: "relative",
  },

  vehicleChipWrapperActive: {
    transform: [{ scale: 1.02 }],
  },

  vehicleChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 120,
  },

  vehicleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  vehicleIconWrapActive: {
    backgroundColor: "#EDE9FE",
  },

  vehicleChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
  },

  vehicleChipTextActive: {
    color: COLORS.primary,
  },

  vehicleDeleteBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  addVehicleChip: {
    borderWidth: 1.5,
    borderColor: "#C4B5FD",
    borderStyle: "dashed",
    backgroundColor: "#F8FBFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    gap: 4,
  },

  addVehicleChipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
  },

  inlineForm: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
  },

  inputLabel: {
    fontSize: 12,
    color: COLORS.textSoft,
    marginBottom: 8,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },

  formActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },

  secondaryBtnText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "700",
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },

  primaryBtnText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },

  timeGrid: {
    gap: 12,
  },

  timeCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },

  timeCardLabel: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontWeight: "600",
    marginBottom: 8,
  },

  timeCardValue: {
    fontSize: 19,
    color: COLORS.text,
    fontWeight: "800",
  },

  timeCardDate: {
    fontSize: 12,
    color: COLORS.textSoft,
    marginTop: 4,
  },

  timeChevron: {
    position: "absolute",
    right: 16,
    top: 28,
  },

  bookingSummary: {
    marginTop: 16,
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryBlock: {
    flex: 1,
  },

  summaryKey: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    marginBottom: 6,
    fontWeight: "600",
  },

  summaryMain: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
  },

  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
  },

  summaryPrice: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "900",
    textAlign: "right",
  },

  bottomBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },

  bottomBarLabel: {
    fontSize: 12,
    color: COLORS.textSoft,
    fontWeight: "600",
  },

  bottomBarPrice: {
    fontSize: 24,
    color: COLORS.text,
    fontWeight: "900",
    marginTop: 2,
  },

  ctaButton: {
    borderRadius: 18,
    overflow: "hidden",
  },

  ctaButtonDisabled: {
    opacity: 0.8,
  },

  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },

  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.5)",
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.72,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },

  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  timeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  timeOptionActive: {
    backgroundColor: "#F8FBFF",
    borderRadius: 12,
    paddingHorizontal: 10,
  },

  timeOptionText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
  },

  timeOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
});

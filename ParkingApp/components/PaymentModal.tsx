import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPay: () => void;
  amount: number;
  loading: boolean;
}

export const PaymentModal = ({
  visible,
  onClose,
  onPay,
  amount,
  loading,
}: PaymentModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.premiumModalContent}>

        <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Secure Payment</Text>
          <Text style={styles.modalSubtitle}>Total: ₹{amount}</Text>
        </LinearGradient>

        <View style={styles.paymentOptions}>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={onPay}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#667eea" />
            ) : (
              <Text>📱 Pay with UPI</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={onPay}
            disabled={loading}
          >
            <Text>💳 Pay with Card / Netbanking</Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={{ color: "#64748B" }}>Maybe Later</Text>
        </TouchableOpacity>

      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    width: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.8)",
  },
  paymentOptions: {
    padding: 20,
    gap: 15,
  },
  methodButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  cancelButton: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
});
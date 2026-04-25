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
import type { PaymentMethod } from "../constants/paymentService";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPay: (method: PaymentMethod) => void;
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
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.premiumModalContent}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.modalHeader}
        >
          <Text style={styles.modalTitle}>Secure Payment</Text>
          <Text style={styles.modalSubtitle}>Total: Rs {amount.toFixed(0)}</Text>
        </LinearGradient>

        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => onPay("upi")}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#4338CA" />
            ) : (
              <>
                <Text style={styles.methodButtonText}>Pay with UPI</Text>
                <Text style={styles.methodHint}>Google Pay, PhonePe, BHIM</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodButton}
            onPress={() => onPay("card")}
            disabled={loading}
          >
            <Text style={styles.methodButtonText}>Pay with Card / Netbanking</Text>
            <Text style={styles.methodHint}>Cards, netbanking, wallet</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Maybe Later</Text>
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
    alignItems: "flex-start",
    gap: 4,
  },
  methodButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 15,
  },
  methodHint: {
    color: "#64748B",
    fontSize: 12,
  },
  cancelButton: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelText: {
    color: "#64748B",
  },
});

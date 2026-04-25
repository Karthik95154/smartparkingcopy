import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ScrollTimePicker,
  type ScrollPickerOption,
} from "./ScrollTimePicker";

type TimePickerModalProps = {
  visible: boolean;
  title: string;
  baseTime: Date;
  selectedOffsetMinutes: number;
  minimumOffsetMinutes: number;
  maximumOffsetMinutes: number;
  onSelect: (minutesValue: number) => void;
  onClose: () => void;
  formatLabel: (date: Date) => string;
  formatDate: (date: Date) => string;
};

type HourBucket = {
  value: number;
  label: string;
  date: Date;
  startMinute: number;
  endMinute: number;
};

const getDateFromOffset = (baseTime: Date, offsetMinutes: number) =>
  new Date(baseTime.getTime() + offsetMinutes * 60 * 1000);

const buildHourBuckets = (
  baseTime: Date,
  minimumOffsetMinutes: number,
  maximumOffsetMinutes: number
) => {
  const buckets: HourBucket[] = [];

  for (let offset = minimumOffsetMinutes; offset <= maximumOffsetMinutes; offset += 1) {
    const currentDate = getDateFromOffset(baseTime, offset);
    const hourStart = new Date(currentDate);
    hourStart.setMinutes(0, 0, 0);
    const hourValue = hourStart.getTime();
    const minuteValue = currentDate.getMinutes();

    const existingBucket = buckets.find((bucket) => bucket.value === hourValue);

    if (!existingBucket) {
      buckets.push({
        value: hourValue,
        label: currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          hour12: true,
        }),
        date: hourStart,
        startMinute: minuteValue,
        endMinute: minuteValue,
      });
      continue;
    }

    existingBucket.startMinute = Math.min(existingBucket.startMinute, minuteValue);
    existingBucket.endMinute = Math.max(existingBucket.endMinute, minuteValue);
  }

  return buckets;
};

const clampOffset = (
  offsetMinutes: number,
  minimumOffsetMinutes: number,
  maximumOffsetMinutes: number
) => Math.min(Math.max(offsetMinutes, minimumOffsetMinutes), maximumOffsetMinutes);

export function TimePickerModal({
  visible,
  title,
  baseTime,
  selectedOffsetMinutes,
  minimumOffsetMinutes,
  maximumOffsetMinutes,
  onSelect,
  onClose,
  formatLabel,
  formatDate,
}: TimePickerModalProps) {
  const [draftOffsetMinutes, setDraftOffsetMinutes] = useState(selectedOffsetMinutes);

  useEffect(() => {
    if (visible) {
      setDraftOffsetMinutes(
        clampOffset(
          selectedOffsetMinutes,
          minimumOffsetMinutes,
          maximumOffsetMinutes
        )
      );
    }
  }, [
    visible,
    selectedOffsetMinutes,
    minimumOffsetMinutes,
    maximumOffsetMinutes,
  ]);

  const hourBuckets = useMemo(
    () => buildHourBuckets(baseTime, minimumOffsetMinutes, maximumOffsetMinutes),
    [baseTime, minimumOffsetMinutes, maximumOffsetMinutes]
  );

  const selectedDate = getDateFromOffset(baseTime, draftOffsetMinutes);
  const selectedHourValue = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedDate.getHours(),
    0,
    0,
    0
  ).getTime();

  const activeHourBucket =
    hourBuckets.find((bucket) => bucket.value === selectedHourValue) || hourBuckets[0];

  const hourOptions: ScrollPickerOption[] = hourBuckets.map((bucket) => ({
    value: bucket.value,
    label: bucket.label,
  }));

  const minuteOptions: ScrollPickerOption[] = Array.from(
    { length: 60 },
    (_, minute) => ({
      value: minute,
      label: minute.toString().padStart(2, "0"),
      disabled:
        minute < activeHourBucket.startMinute ||
        minute > activeHourBucket.endMinute,
    })
  );

  const handleHourChange = (hourValue: number) => {
    const nextBucket = hourBuckets.find((bucket) => bucket.value === hourValue);
    if (!nextBucket) {
      return;
    }

    const currentMinutes = selectedDate.getMinutes();
    const nextMinutes = Math.min(
      Math.max(currentMinutes, nextBucket.startMinute),
      nextBucket.endMinute
    );

    const nextDate = new Date(nextBucket.date);
    nextDate.setMinutes(nextMinutes, 0, 0);

    const nextOffset = Math.round(
      (nextDate.getTime() - baseTime.getTime()) / (60 * 1000)
    );
    setDraftOffsetMinutes(
      clampOffset(nextOffset, minimumOffsetMinutes, maximumOffsetMinutes)
    );
  };

  const handleMinuteChange = (minuteValue: number) => {
    if (!activeHourBucket) {
      return;
    }

    const nextDate = new Date(activeHourBucket.date);
    nextDate.setMinutes(minuteValue, 0, 0);

    const nextOffset = Math.round(
      (nextDate.getTime() - baseTime.getTime()) / (60 * 1000)
    );
    setDraftOffsetMinutes(
      clampOffset(nextOffset, minimumOffsetMinutes, maximumOffsetMinutes)
    );
  };

  const handleDone = () => {
    onSelect(draftOffsetMinutes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Selected time</Text>
            <Text style={styles.previewValue}>{formatLabel(selectedDate)}</Text>
            <Text style={styles.previewDate}>{formatDate(selectedDate)}</Text>
          </View>

          <View style={styles.wheelRow}>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>Hour</Text>
              <ScrollTimePicker
                options={hourOptions}
                selectedValue={activeHourBucket?.value ?? 0}
                onValueChange={handleHourChange}
              />
            </View>

            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>Minute</Text>
              <ScrollTimePicker
                options={minuteOptions}
                selectedValue={selectedDate.getMinutes()}
                onValueChange={handleMinuteChange}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  previewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  previewDate: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  wheelRow: {
    flexDirection: "row",
    gap: 14,
  },
  wheelColumn: {
    flex: 1,
  },
  wheelLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    marginBottom: 10,
  },
  doneButton: {
    marginTop: 18,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type ScrollPickerOption = {
  value: number;
  label: string;
  disabled?: boolean;
};

type ScrollTimePickerProps = {
  options: ScrollPickerOption[];
  selectedValue: number;
  onValueChange: (value: number) => void;
};

const ITEM_HEIGHT = 56;
const VISIBLE_ROWS = 5;
const SIDE_PADDING = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

export function ScrollTimePicker({
  options,
  selectedValue,
  onValueChange,
}: ScrollTimePickerProps) {
  const listRef = useRef<FlatList<ScrollPickerOption>>(null);

  const getNearestEnabledIndex = useCallback((targetIndex: number) => {
    if (!options.length) {
      return 0;
    }

    if (!options[targetIndex]?.disabled) {
      return targetIndex;
    }

    for (let distance = 1; distance < options.length; distance += 1) {
      const previousIndex = targetIndex - distance;
      if (previousIndex >= 0 && !options[previousIndex]?.disabled) {
        return previousIndex;
      }

      const nextIndex = targetIndex + distance;
      if (nextIndex < options.length && !options[nextIndex]?.disabled) {
        return nextIndex;
      }
    }

    return targetIndex;
  }, [options]);

  const selectedIndex = useMemo(() => {
    const exactIndex = options.findIndex((option) => option.value === selectedValue);
    if (exactIndex >= 0) {
      return getNearestEnabledIndex(exactIndex);
    }

    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    return firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
  }, [getNearestEnabledIndex, options, selectedValue]);

  useEffect(() => {
    if (!options.length) {
      return;
    }

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [options, selectedIndex]);

  const snapToClosest = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!options.length) {
      return;
    }

    const rawIndex = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const boundedIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
    const nextIndex = getNearestEnabledIndex(boundedIndex);
    const nextOption = options[nextIndex];

    if (nextOption && nextOption.value !== selectedValue && !nextOption.disabled) {
      onValueChange(nextOption.value);
    }

    listRef.current?.scrollToOffset({
      offset: nextIndex * ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.selectionOverlay} />

      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={(item) => String(item.value)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={snapToClosest}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        renderItem={({ item }) => {
          const active = item.value === selectedValue;

          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                if (!item.disabled) {
                  onValueChange(item.value);
                }
              }}
              activeOpacity={0.85}
              disabled={item.disabled}
            >
              <Text
                style={[
                  styles.itemText,
                  item.disabled && styles.itemTextDisabled,
                  active && !item.disabled && styles.itemTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    justifyContent: "center",
  },
  content: {
    paddingVertical: SIDE_PADDING,
  },
  selectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
  },
  itemTextActive: {
    color: "#4338CA",
    fontWeight: "800",
  },
  itemTextDisabled: {
    color: "#CBD5E1",
  },
});

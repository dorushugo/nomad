import { GripVertical } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import type { Item } from "../stores/tripStore";
import { colors } from "../theme";
import { TimelineBlock } from "./TimelineBlock";

const ITEM_HEIGHT = 88;

function computePositions(from: number, to: number, n: number): number[] {
  "worklet";
  const p = Array.from({ length: n }, (_, i) => i);
  if (from === to) return p;
  p[from] = to;
  const dir = to > from ? 1 : -1;
  for (let i = 0; i < n; i++) {
    if (i === from) continue;
    if (dir > 0 && i > from && i <= to) p[i] = i - 1;
    if (dir < 0 && i < from && i >= to) p[i] = i + 1;
  }
  return p;
}

interface DraggableItemListProps {
  items: Item[];
  onReorder: (reordered: Item[]) => void;
  onPressItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

function DraggableRow({
  item,
  index,
  itemCount,
  activeIndex,
  activeTranslateY,
  positions,
  onPress,
  onDelete,
  onDragStart,
  onDragEnd,
  commitReorder,
}: {
  item: Item;
  index: number;
  itemCount: number;
  activeIndex: ReturnType<typeof useSharedValue<number>>;
  activeTranslateY: ReturnType<typeof useSharedValue<number>>;
  positions: ReturnType<typeof useSharedValue<number[]>>;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  commitReorder: (finalPositions: number[]) => void;
}) {
  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      "worklet";
      activeIndex.value = index;
      activeTranslateY.value = 0;
      runOnJS(onDragStart)();
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      if (activeIndex.value !== index) return;
      activeTranslateY.value = e.translationY;
      const targetSlot = Math.max(
        0,
        Math.min(itemCount - 1, index + Math.round(e.translationY / ITEM_HEIGHT))
      );
      positions.value = computePositions(index, targetSlot, itemCount);
    })
    .onEnd(() => {
      "worklet";
      if (activeIndex.value !== index) return;
      runOnJS(commitReorder)(positions.value);
      activeIndex.value = -1;
      activeTranslateY.value = 0;
    })
    .onFinalize(() => {
      "worklet";
      if (activeIndex.value === index) {
        activeIndex.value = -1;
        activeTranslateY.value = 0;
      }
      runOnJS(onDragEnd)();
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  const animStyle = useAnimatedStyle(() => {
    const slot = positions.value[index];
    const isDragged = activeIndex.value === index;
    const translateY = isDragged
      ? activeTranslateY.value + (slot - index) * ITEM_HEIGHT
      : withSpring((slot - index) * ITEM_HEIGHT, { damping: 20, stiffness: 300 });
    return {
      zIndex: isDragged ? 100 : 1,
      transform: [{ translateY }, { scale: withSpring(isDragged ? 1.04 : 1) }],
    };
  });

  return (
    <Animated.View style={[styles.row, animStyle]}>
      <GestureDetector gesture={composed}>
        <View style={styles.handle} hitSlop={8}>
          <GripVertical size={18} color={colors.grayMuted} />
        </View>
      </GestureDetector>
      <View style={styles.cardWrapper}>
        <TimelineBlock item={item} onPress={onPress} onDelete={onDelete} />
      </View>
    </Animated.View>
  );
}

export function DraggableItemList({
  items,
  onReorder,
  onPressItem,
  onDeleteItem,
  onDragStateChange,
}: DraggableItemListProps) {
  const activeIndex = useSharedValue(-1);
  const activeTranslateY = useSharedValue(0);
  const positions = useSharedValue(items.map((_, i) => i));

  // Reset positions when items array changes (new day or item added/deleted)
  const prevItemIdsRef = useRef(items.map((i) => i.id).join(","));
  const currentIds = items.map((i) => i.id).join(",");
  if (prevItemIdsRef.current !== currentIds) {
    prevItemIdsRef.current = currentIds;
    positions.value = items.map((_, i) => i);
  }

  const handleDragStart = useCallback(() => {
    onDragStateChange?.(true);
  }, [onDragStateChange]);

  const handleDragEnd = useCallback(() => {
    onDragStateChange?.(false);
  }, [onDragStateChange]);

  const commitReorder = useCallback(
    (finalPositions: number[]) => {
      const reordered = new Array<Item>(items.length);
      for (let i = 0; i < items.length; i++) {
        reordered[finalPositions[i]] = items[i];
      }
      onReorder(reordered);
    },
    [items, onReorder]
  );

  if (items.length === 0) return null;

  return (
    <View style={{ height: items.length * ITEM_HEIGHT }}>
      {items.map((item, index) => (
        <DraggableRow
          key={item.id}
          item={item}
          index={index}
          itemCount={items.length}
          activeIndex={activeIndex}
          activeTranslateY={activeTranslateY}
          positions={positions}
          onPress={() => onPressItem(item)}
          onDelete={() => onDeleteItem(item)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          commitReorder={commitReorder}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ITEM_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  handle: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  cardWrapper: {
    flex: 1,
  },
});

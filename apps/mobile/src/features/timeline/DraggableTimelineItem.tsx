import type { Item } from "@nomad/shared";
import { useEffect } from "react";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { TimelineBlock } from "../../components/TimelineBlock";
import { spacing } from "../../theme";
import { TIMELINE_LEFT } from "./timeline.constants";
import type { ItemPosition } from "./timeline.utils";

interface DraggableTimelineItemProps {
  item: Item;
  pos: ItemPosition;
  draggedItemId: SharedValue<string>;
  dragDeltaY: SharedValue<number>;
  onPress: () => void;
  onDelete?: () => void;
}

// Absolutely-positioned timeline block that animates drag offset/scale
// when its id matches `draggedItemId.value`. Position changes (after
// snap-to-grid) come back through the `pos` prop and are mirrored to
// shared values so the worklet animates without re-layout.
export function DraggableTimelineItem({
  item,
  pos,
  draggedItemId,
  dragDeltaY,
  onPress,
  onDelete,
}: DraggableTimelineItemProps) {
  const topSV = useSharedValue(pos.top);
  const heightSV = useSharedValue(pos.height);

  useEffect(() => {
    topSV.value = pos.top;
    heightSV.value = pos.height;
  }, [pos.top, pos.height, topSV, heightSV]);

  const animStyle = useAnimatedStyle(() => {
    const isDragged = draggedItemId.value === item.id;
    return {
      top: topSV.value,
      height: heightSV.value,
      transform: [
        { translateY: isDragged ? dragDeltaY.value : 0 } as const,
        { scale: isDragged ? 1.04 : 1 } as const,
      ],
      zIndex: isDragged ? 100 : 2,
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", left: TIMELINE_LEFT + spacing.sm, right: spacing.lg, zIndex: 2 },
        animStyle,
      ]}
    >
      <TimelineBlock item={item} onPress={onPress} onDelete={onDelete} fill />
    </Animated.View>
  );
}

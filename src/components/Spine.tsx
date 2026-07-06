import { View } from 'react-native';
import { useTheme } from '@/theme';
import { statusColor, type Segment } from '@/lib/status';

interface SpineProps {
  segments: Segment[];
  width?: number;
  minSegmentHeight?: number;
  gap?: number;
}

/**
 * The signature left vertical status spine from journal-d1.html. Each segment
 * maps to one block of the day, colored by completion. Falls back to a single
 * dim rail when the day is empty.
 */
export function Spine({ segments, width = 3, minSegmentHeight = 40, gap = 2 }: SpineProps) {
  const { colors, radius } = useTheme();
  const data = segments.length > 0 ? segments : [{ status: 'skip' as const, label: '' }];
  return (
    <View style={{ width, flexDirection: 'column', gap, paddingTop: 6 }}>
      {data.map((seg, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            minHeight: minSegmentHeight,
            borderRadius: radius.sm,
            backgroundColor: statusColor(seg.status, colors),
            opacity: seg.status === 'partial' ? 0.8 : 1,
          }}
        />
      ))}
    </View>
  );
}

/** Compact horizontal status bar for timeline cards. */
export function MiniSpine({ segments }: { segments: Segment[] }) {
  const { colors, radius } = useTheme();
  const data = segments.length > 0 ? segments : [{ status: 'skip' as const, label: '' }];
  return (
    <View style={{ flexDirection: 'row', gap: 3, height: 4 }}>
      {data.map((seg, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            borderRadius: radius.sm,
            backgroundColor: statusColor(seg.status, colors),
            opacity: seg.status === 'partial' ? 0.8 : 1,
          }}
        />
      ))}
    </View>
  );
}

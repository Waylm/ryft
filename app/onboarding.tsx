import { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mono, Serif, Button } from '@/components';
import { useTheme } from '@/theme';
import { setKv } from '@/db/queries';
import { ONBOARDING_KEY } from '@/lib/flags';

interface Slide {
  kicker: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    kicker: 'RYFT',
    title: 'Close the gap.',
    body: 'A journal for the version of you that refuses to slip. Every day is a page, and every page is evidence.',
  },
  {
    kicker: 'LOG THE GRIND',
    title: 'Write what you did.',
    body: 'Checklists, notes, numbers, photos. Build each day however you like — skincare, ideas, lifts, whatever moves you forward.',
  },
  {
    kicker: 'BEAT YESTERDAY',
    title: 'Measure the climb.',
    body: 'Ryft remembers your best. See today against your prime — the day you were unstoppable — and exactly how far back you have to fight.',
  },
  {
    kicker: 'NO TOMORROW',
    title: 'Reminders that bite.',
    body: '"You said you would change." Set the words that get you moving, then go prove them right.',
  },
];

export default function Onboarding() {
  const theme = useTheme();
  const { colors, spacing, fontSize } = theme;
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  const finish = async () => {
    await setKv(db, ONBOARDING_KEY, '1');
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={{
              width,
              flex: 1,
              paddingHorizontal: spacing.xl,
              justifyContent: 'center',
            }}
          >
            {/* accent rule */}
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: colors.accent,
                marginBottom: spacing.xl,
                borderRadius: 2,
              }}
            />
            <Mono size={fontSize.tiny} weight="bold" tracking={3} upper color={colors.mid}>
              {slide.kicker}
            </Mono>
            <Serif
              size={fontSize.display}
              color={colors.bright}
              style={{ marginTop: spacing.md, lineHeight: fontSize.display * 1.05 }}
            >
              {slide.title}
            </Serif>
            <Serif
              size={fontSize.lg}
              color={colors.text}
              style={{ marginTop: spacing.lg, lineHeight: fontSize.lg * 1.6 }}
            >
              {slide.body}
            </Serif>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? colors.accent : colors.dim,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isLast ? (
            <Button label="Skip" variant="ghost" onPress={finish} haptic={false} />
          ) : null}
          <Button label={isLast ? 'Enter' : 'Next'} onPress={next} />
        </View>
      </View>
    </View>
  );
}

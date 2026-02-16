import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { BorderRadius as BorderRadiusConst } from '../constants/theme';

const PAGE_WIDTH = 72;
const PAGE_HEIGHT = 96;
const NUM_PAGES = 3;

type CalendarPageLoaderProps = {
  /** Показывать ли на весь экран с полупрозрачным фоном */
  fullScreen?: boolean;
};

export default function CalendarPageLoader({ fullScreen = false }: CalendarPageLoaderProps) {
  const { colors, Spacing, BorderRadius } = useTheme();
  const anims = useRef([
    new Animated.Value(1),
    ...Array.from({ length: NUM_PAGES - 1 }, () => new Animated.Value(0.3)),
  ]).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const duration = 450;
    const animateNext = (index: number) => {
      if (!mounted.current) return;
      Animated.sequence([
        Animated.parallel(
          anims.map((a, j) =>
            Animated.timing(a, {
              toValue: j === index ? 1 : 0.3,
              duration,
              useNativeDriver: true,
            })
          )
        ),
        Animated.delay(80),
      ]).start(({ finished }) => {
        if (finished && mounted.current) animateNext((index + 1) % NUM_PAGES);
      });
    };
    animateNext(0);
    return () => {
      mounted.current = false;
    };
  }, [anims]);

  const renderPage = (index: number) => {
    const opacity = anims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 1],
    });
    const scale = anims[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1.02],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.page,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={[styles.binding, { backgroundColor: colors.border }]} />
        <View style={[styles.line, { backgroundColor: colors.borderLight }]} />
        <View style={[styles.line, styles.lineShort, { backgroundColor: colors.borderLight }]} />
      </Animated.View>
    );
  };

  const content = (
    <View style={styles.stack}>
      {Array.from({ length: NUM_PAGES }, (_, i) => renderPage(i))}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.overlay }]}>
        <View style={styles.fallbackWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>Загрузка…</Text>
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fallbackWrap: {
    alignItems: 'center',
    zIndex: 1001,
    elevation: 8,
  },
  fallbackText: {
    marginTop: 12,
    fontSize: 16,
  },
  stack: {
    width: PAGE_WIDTH + (NUM_PAGES - 1) * 12,
    height: PAGE_HEIGHT + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {
    position: 'absolute',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    borderRadius: BorderRadiusConst.md,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  binding: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: BorderRadiusConst.sm,
    borderBottomLeftRadius: BorderRadiusConst.sm,
  },
  line: {
    height: 1,
    marginTop: 14,
    marginLeft: 10,
    width: PAGE_WIDTH - 20,
  },
  lineShort: {
    width: (PAGE_WIDTH - 20) * 0.6,
    marginTop: 10,
  },
});

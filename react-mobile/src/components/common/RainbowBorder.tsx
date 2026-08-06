import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Gemini-style vibrant spectrum. Repeats the first color at the end for a seamless loop.
const RAINBOW = [
  '#ff2d55', '#ff9500', '#ffcc00', '#34c759',
  '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55',
] as unknown as readonly [string, string, ...string[]];

type Props = {
  children: React.ReactNode;
  /** Thickness of the glowing ring. */
  borderWidth?: number;
  /** Outer corner radius. */
  radius?: number;
  /** Fill color that masks the center so only the ring shows. */
  bg?: string;
  /** Diameter of the rotating gradient square — should exceed the card's diagonal. */
  size?: number;
  /** Pause the animation (e.g. when the feature is unavailable). */
  active?: boolean;
  /** Seconds per full rotation. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Animated rotating rainbow gradient border. Renders a large spinning gradient
 * square clipped to the outer radius, with an inset opaque view masking the
 * middle — leaving a colorful ring around `children`.
 *
 * Uses React Native's built-in Animated (native driver) — no reanimated/worklets.
 */
export function RainbowBorder({
  children,
  borderWidth = 2,
  radius = 20,
  bg = '#0a0a0a',
  size = 560,
  active = true,
  duration = 5,
  style,
}: Props) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    rot.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rot, {
        toValue: 1,
        duration: duration * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, rot]);

  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Animated.View style={{ width: size, height: size, position: 'absolute', transform: [{ rotate: spin }] }}>
          <LinearGradient
            colors={RAINBOW}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
      <View
        style={{
          margin: borderWidth,
          borderRadius: Math.max(radius - borderWidth, 0),
          backgroundColor: bg,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

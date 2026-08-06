/**
 * Roulette wheel — React Native Animated API (no Reanimated dependency).
 * Fixes the JSI crash from Reanimated 4.x in Expo Go.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { Colors } from '../../constants/colors';

const LABELS = [
  'ACTION','DRAMA','COMEDY','HORROR',
  'SCI-FI','THRILLER','ROMANCE','MYSTERY',
  'FANTASY','WESTERN','WAR','CRIME',
  'HISTORY','MUSIC','FAMILY','ANIMATION',
];
const SEGMENTS = LABELS.length;

const SEG_COLORS = [
  '#FF6B35','#9B59B6','#FFD700','#2ECC71',
  '#00CED1','#E74C3C','#FF69B4','#3498DB',
  '#8B4513','#C0392B','#6B8E23','#1ABC9C',
  '#D4A843','#E91E63','#4CAF50','#FF9800',
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const s1 = polar(cx, cy, outerR, startDeg);
  const s2 = polar(cx, cy, outerR, endDeg);
  const s3 = polar(cx, cy, innerR, endDeg);
  const s4 = polar(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${s2.x} ${s2.y}`,
    `L ${s3.x} ${s3.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${s4.x} ${s4.y}`,
    'Z',
  ].join(' ');
}

interface Props {
  isSpinning: boolean;
  onSpinComplete?: () => void;
  size?: number;
}

export function RouletteWheel({ isSpinning, onSpinComplete, size = 300 }: Props) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const currentAnim = useRef<Animated.CompositeAnimation | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * 0.28;
  const segDeg = 360 / SEGMENTS;

  const startIdle = useCallback(() => {
    rotateAnim.setValue(0);
    currentAnim.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    currentAnim.current.start();
  }, [rotateAnim]);

  useEffect(() => {
    if (isSpinning) {
      currentAnim.current?.stop();
      rotateAnim.setValue(0);
      currentAnim.current = Animated.timing(rotateAnim, {
        toValue: 6 + Math.random() * 2,
        duration: 4500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      currentAnim.current.start(({ finished }) => {
        if (finished) onSpinComplete?.();
      });
    } else {
      currentAnim.current?.stop();
      startIdle();
    }
    return () => currentAnim.current?.stop();
  }, [isSpinning, startIdle]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.glowRing, { width: size, height: size, borderRadius: size / 2 }]} />
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={size} height={size}>
          <G>
            {LABELS.map((label, i) => {
              const startDeg = i * segDeg;
              const endDeg   = startDeg + segDeg;
              const midDeg   = startDeg + segDeg / 2;
              const labelR   = (outerR + innerR) / 2;
              const lp       = polar(cx, cy, labelR, midDeg);
              return (
                <G key={i}>
                  <Path
                    d={arc(cx, cy, outerR, innerR, startDeg, endDeg)}
                    fill={SEG_COLORS[i]}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={lp.x} y={lp.y}
                    fill="#fff" fontSize={7} fontWeight="800"
                    textAnchor="middle" alignmentBaseline="middle"
                    rotation={midDeg - 90} origin={`${lp.x},${lp.y}`}
                  >
                    {label}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={cx} cy={cy} r={innerR} fill={Colors.bgCard} stroke={Colors.border} strokeWidth={2} />
            <Circle cx={cx} cy={cy} r={innerR * 0.45} fill={Colors.accent} />
          </G>
        </Svg>
      </Animated.View>
      {/* Static pointer at top */}
      <View style={[styles.pointer, { left: cx - 9 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  pointer: {
    position: 'absolute',
    top: 0,
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 18,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});

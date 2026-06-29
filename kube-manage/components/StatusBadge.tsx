import type { PodStatus } from '@/types/kubernetes';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

interface StatusBadgeProps {
  status: PodStatus | 'Ready' | 'NotReady' | 'Active' | 'Terminating';
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRunning = status === 'Running' || status === 'Ready' || status === 'Active';

  useEffect(() => {
    if (!isRunning) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isRunning]);

  const getStatusColor = () => {
    switch (status) {
      case 'Running':
      case 'Ready':
      case 'Active':
        return { bg: '#00FF8820', text: '#00FF88', border: '#00FF8840' };
      case 'Pending':
        return { bg: '#FFB80020', text: '#FFB800', border: '#FFB80040' };
      case 'Failed':
      case 'NotReady':
        return { bg: '#FF445520', text: '#FF4455', border: '#FF445540' };
      case 'Succeeded':
        return { bg: '#00D9FF20', text: '#00D9FF', border: '#00D9FF40' };
      case 'Terminating':
        return { bg: '#AA66FF20', text: '#AA66FF', border: '#AA66FF40' };
      default:
        return { bg: '#66666620', text: '#666666', border: '#66666640' };
    }
  };

  const colors = getStatusColor();
  const isMedium = size === 'medium';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        isMedium && styles.badgeMedium,
      ]}
    >
      <View style={styles.dotContainer}>
        {isRunning && (
          <Animated.View
            style={[
              styles.dotPulse,
              { backgroundColor: colors.text, transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: colors.text }]} />
      </View>
      <Text style={[styles.text, { color: colors.text }, isMedium && styles.textMedium]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  dotContainer: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  dotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    opacity: 0.4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  textMedium: {
    fontSize: 13,
  },
});

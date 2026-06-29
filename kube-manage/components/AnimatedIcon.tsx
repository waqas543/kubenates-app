import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export type IconAnimationType = 'float' | 'spin' | 'pulse' | 'swing' | 'flash' | 'bounce';

interface AnimatedIconProps {
  children: React.ReactNode;
  type: IconAnimationType;
}

export function AnimatedIcon({ children, type }: AnimatedIconProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    switch (type) {
      case 'float':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        break;

      case 'spin':
        animation = Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        break;

      case 'pulse':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        );
        break;

      case 'swing':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: -1,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 500,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        );
        break;

      case 'flash':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 300,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(900),
          ]),
        );
        break;

      case 'bounce':
        animation = Animated.loop(
          Animated.sequence([
            Animated.spring(anim, {
              toValue: 1,
              tension: 200,
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(600),
          ]),
        );
        break;

      default:
        return;
    }

    animation.start();
    return () => animation.stop();
  }, [type]);

  const getTransform = () => {
    switch (type) {
      case 'float':
        return [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }];
      case 'spin':
        return [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }];
      case 'pulse':
        return [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }];
      case 'swing':
        return [{ rotate: anim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] }) }];
      case 'flash':
        return [];
      case 'bounce':
        return [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }];
      default:
        return [];
    }
  };

  const getOpacity = () => {
    if (type === 'flash') {
      return anim.interpolate({ inputRange: [0.3, 1], outputRange: [0.3, 1] });
    }
    return 1;
  };

  return (
    <Animated.View style={{ transform: getTransform(), opacity: getOpacity() }}>
      {children}
    </Animated.View>
  );
}

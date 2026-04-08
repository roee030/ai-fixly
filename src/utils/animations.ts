import {
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { ANIMATION } from '../constants/animation';

export const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export const smoothSpring = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
};

export function fadeIn(opacity: SharedValue<number>, duration = ANIMATION.NORMAL) {
  opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
}

export function fadeOut(opacity: SharedValue<number>, duration = ANIMATION.FAST) {
  opacity.value = withTiming(0, { duration, easing: Easing.in(Easing.ease) });
}

export function slideUp(translateY: SharedValue<number>) {
  translateY.value = withSpring(0, springConfig);
}

export function pulse(scale: SharedValue<number>) {
  scale.value = withRepeat(
    withSequence(
      withTiming(1.05, { duration: 1000 }),
      withTiming(1, { duration: 1000 })
    ),
    -1,
    true
  );
}

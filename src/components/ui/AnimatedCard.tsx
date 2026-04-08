import React, { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

interface AnimatedCardProps extends ViewProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
}

export function AnimatedCard({ children, index = 0, delay = 0, style, ...props }: AnimatedCardProps) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const totalDelay = delay + index * 80;
    translateY.value = withDelay(totalDelay, withSpring(0, { damping: 20, stiffness: 90 }));
    opacity.value = withDelay(totalDelay, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

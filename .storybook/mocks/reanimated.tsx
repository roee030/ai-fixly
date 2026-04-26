/**
 * Reanimated mock for Storybook web.
 *
 * Vite can't run Reanimated's babel plugin, so we substitute the
 * library with a thin shim that maps every API to the equivalent RN core
 * primitive (or a no-op). Stories that depend on real animations
 * (springs, repeats, gestures) won't be perfectly faithful — but the
 * point of Storybook is to inspect the static visual, not to QA the
 * animation system.
 */
import * as React from 'react';
import { View, Text, ScrollView, Image, FlatList } from 'react-native';

// "Animated" components — just forward to the RN core component.
const make = (Component: any) =>
  React.forwardRef((props: any, ref: any) => React.createElement(Component, { ...props, ref }));

const AnimatedView = make(View);
const AnimatedText = make(Text);
const AnimatedScrollView = make(ScrollView);
const AnimatedImage = make(Image);
const AnimatedFlatList = make(FlatList);

const Animated = {
  View: AnimatedView,
  Text: AnimatedText,
  ScrollView: AnimatedScrollView,
  Image: AnimatedImage,
  FlatList: AnimatedFlatList,
  createAnimatedComponent: make,
};

export default Animated;
export { AnimatedView as View, AnimatedText as Text };

// Hooks — return inert values so any component that calls them renders.
export const useSharedValue = <T,>(init: T) => ({ value: init });
export const useAnimatedStyle = () => ({});
export const useAnimatedScrollHandler = () => () => {};
export const useDerivedValue = <T,>(fn: () => T) => ({ value: fn() });
export const useAnimatedReaction = () => {};

// Animation factories — return their input synchronously.
export const withTiming = <T,>(v: T) => v;
export const withSpring = <T,>(v: T) => v;
export const withDelay = <T,>(_d: number, v: T) => v;
export const withRepeat = <T,>(v: T) => v;
export const withSequence = <T,>(...vals: T[]) => vals[vals.length - 1];

// Easing — every common name maps to identity.
export const Easing = new Proxy(
  {},
  {
    get:
      () =>
      (...args: unknown[]) =>
        args[0],
  },
) as any;

// Layout / entrance animations — chainable proxy that swallows any call.
const chainable: any = new Proxy(() => chainable, {
  get: () => chainable,
  apply: () => chainable,
});

export const FadeIn = chainable;
export const FadeOut = chainable;
export const FadeInDown = chainable;
export const FadeInUp = chainable;
export const SlideInRight = chainable;
export const SlideOutLeft = chainable;
export const Layout = chainable;

export const runOnJS = <T extends (...args: any[]) => any>(fn: T) => fn;
export const runOnUI = <T extends (...args: any[]) => any>(fn: T) => fn;

export const interpolate = () => 0;
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };

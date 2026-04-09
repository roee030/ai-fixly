import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { COLORS } from '../../constants';

interface SkeletonImageProps extends Omit<ImageProps, 'onLoad' | 'onError' | 'style'> {
  width: number;
  height: number;
  borderRadius?: number;
  containerStyle?: ViewStyle;
}

export function SkeletonImage({
  width,
  height,
  borderRadius = 8,
  containerStyle,
  ...props
}: SkeletonImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, containerStyle]}>
      {loading && !error && (
        <View style={StyleSheet.absoluteFillObject}>
          <Skeleton width={width} height={height} borderRadius={borderRadius} />
        </View>
      )}
      {error ? (
        <View style={[StyleSheet.absoluteFillObject, styles.errorView]} />
      ) : (
        <Image
          {...props}
          style={{ width, height, borderRadius }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorView: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

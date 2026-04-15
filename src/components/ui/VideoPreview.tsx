import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

/**
 * Optional in-app video player.
 *
 * `expo-video` ships a native module that has to be compiled into the dev
 * build. If the user is running an older APK that was built before we added
 * the dependency, requiring it crashes the whole route ("Cannot find native
 * module 'ExpoVideo'"). We swallow that here so the rest of the screen keeps
 * working — they just get a static placeholder until they rebuild.
 */
let VideoModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VideoModule = require('expo-video');
} catch {
  VideoModule = null;
}

export interface VideoPreviewProps {
  uri: string;
  /** Style for the rendered surface (size + radius). */
  style?: any;
  /** Optional fallback message when the native module isn't available. */
  fallbackMessage?: string;
}

export function VideoPreview({ uri, style, fallbackMessage }: VideoPreviewProps) {
  if (!VideoModule?.useVideoPlayer || !VideoModule?.VideoView) {
    return <NativeMissingFallback style={style} message={fallbackMessage} />;
  }
  return <RealVideoView uri={uri} style={style} />;
}

function NativeMissingFallback({ style, message }: { style?: any; message?: string }) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="play-circle-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.fallbackText}>
        {message || 'תצוגת וידאו תהיה זמינה אחרי בנייה מחודשת של האפליקציה'}
      </Text>
    </View>
  );
}

function RealVideoView({ uri, style }: { uri: string; style?: any }) {
  // VideoModule is guaranteed truthy at this point (parent already checked).
  const player = VideoModule.useVideoPlayer(uri, (p: any) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoModule.VideoView
      style={style}
      player={player}
      allowsFullscreen
      nativeControls
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#101015',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  fallbackText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

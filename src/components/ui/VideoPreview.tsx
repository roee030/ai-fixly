import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

/**
 * Optional in-app video player.
 *
 * `expo-video` ships a native module that has to be compiled into the dev
 * build. If the user is running an older APK that was built before we added
 * the dependency, requiring it crashes the whole route ("Cannot find native
 * module 'ExpoVideo'"). We swallow that here so the rest of the screen keeps
 * working.
 *
 * Three levels of fidelity:
 *   1. expo-video available          — full inline playback with controls.
 *   2. only a posterUri is available — render the thumbnail full-size so
 *      the user at least sees which clip they picked.
 *   3. neither                       — text fallback asking to rebuild.
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
  /** Optional JPG URI captured at pick time — used as a fallback preview. */
  posterUri?: string;
  /** Style for the rendered surface (size + radius). */
  style?: any;
  /** Optional fallback message when the native module isn't available. */
  fallbackMessage?: string;
}

export function VideoPreview({ uri, posterUri, style, fallbackMessage }: VideoPreviewProps) {
  if (!VideoModule?.useVideoPlayer || !VideoModule?.VideoView) {
    return <PosterFallback posterUri={posterUri} style={style} message={fallbackMessage} />;
  }
  return <RealVideoView uri={uri} style={style} />;
}

function PosterFallback({
  posterUri,
  style,
  message,
}: {
  posterUri?: string;
  style?: any;
  message?: string;
}) {
  if (posterUri) {
    return (
      <View style={[styles.posterWrap, style]}>
        <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
        {/* Dim scrim + play icon to make it clear this is the first frame,
            not the playing video. */}
        <View style={styles.posterOverlay}>
          <Ionicons name="play-circle-outline" size={72} color="#FFFFFF" />
          <Text style={styles.posterHint}>
            {message || 'הסרטון יתנגן אחרי בנייה מחודשת של האפליקציה'}
          </Text>
        </View>
      </View>
    );
  }
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
  posterWrap: {
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
    paddingHorizontal: 24,
  },
  posterHint: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

import { View, Text, Image, StyleSheet, Platform } from 'react-native';
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
 *   1. Web                            — plain HTML5 <video controls>, most
 *                                       reliable on browsers.
 *   2. expo-video available           — full inline playback with controls.
 *   3. only a posterUri is available  — the thumbnail is shown full-size
 *                                       so the user still sees the clip.
 *   4. neither                        — text fallback asking to rebuild.
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
  // On web, skip expo-video entirely and use a plain <video controls>. It's
  // reliable across browsers and doesn't depend on any native module — more
  // importantly, `useVideoPlayer` sometimes initialises in an odd state when
  // mounted inside a RN Modal on web, which was the root cause of "video
  // loads but doesn't play" reports from providers opening the WhatsApp link
  // in a browser.
  if (Platform.OS === 'web') {
    return <WebVideoPlayer uri={uri} posterUri={posterUri} style={style} />;
  }
  if (!VideoModule?.useVideoPlayer || !VideoModule?.VideoView) {
    return <PosterFallback posterUri={posterUri} style={style} message={fallbackMessage} />;
  }
  return <RealVideoView uri={uri} style={style} />;
}

/**
 * Web-only player. Uses React Native Web's escape hatch: when you pass the
 * tag name as a string to createElement it renders a DOM node verbatim, so
 * we get a real <video controls> without needing expo-video's web runtime.
 */
function WebVideoPlayer({ uri, posterUri, style }: { uri: string; posterUri?: string; style?: any }) {
  const createElement = require('react').createElement;
  const flatStyle = StyleSheet.flatten(style) || {};
  const htmlStyle = {
    width: flatStyle.width ?? '100%',
    height: flatStyle.height ?? 360,
    borderRadius: flatStyle.borderRadius ?? 12,
    backgroundColor: '#000',
    objectFit: 'contain' as const,
  };
  return createElement('video', {
    src: uri,
    poster: posterUri,
    controls: true,
    autoPlay: true,
    playsInline: true,
    style: htmlStyle,
  });
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

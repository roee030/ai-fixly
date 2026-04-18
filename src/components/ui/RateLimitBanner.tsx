import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import type { CooldownDecision } from '../../services/rateLimit/requestRateLimit';

/**
 * Polite banner shown while the user is inside a rate-limit cooldown for
 * creating a new service request. Renders nothing when the decision is
 * `allowed` so callers can drop it into any screen without branching.
 *
 * The countdown (`mm:ss`) is formatted from the `waitMs` on the passed
 * decision. Parents get the decision from `useRequestRateLimit()`; we
 * don't pull the hook here so the banner stays a dumb presentational
 * piece and can be screenshotted / composed / reused.
 */
export function RateLimitBanner({ decision }: { decision: CooldownDecision }) {
  if (decision.waitMs <= 0) return null;

  const { minutes, seconds } = formatWait(decision.waitMs);
  const isSpamBlock = decision.reason === 'spam-block';

  const title = isSpamBlock
    ? 'זיהינו ניסיון ספאם'
    : 'רגע, מצננים את הקצב';
  const body = isSpamBlock
    ? `כדי לשמור על שירות הוגן לכולם, חסמנו שליחה חדשה למשך שעה. תוכל לשלוח בקשה בעוד ${minutes}:${seconds}.`
    : `כדי לשמור על שירות הוגן לכולם, ניתן לשלוח בקשה נוספת בעוד ${minutes}:${seconds}.`;

  return (
    <View style={[styles.container, isSpamBlock && styles.containerSevere]}>
      <Ionicons
        name={isSpamBlock ? 'alert-circle' : 'time-outline'}
        size={18}
        color={isSpamBlock ? COLORS.error : COLORS.warning}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, isSpamBlock && { color: COLORS.error }]}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

function formatWait(ms: number): { minutes: string; seconds: string } {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return {
    minutes: String(m),
    seconds: String(s).padStart(2, '0'),
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.warning + '15',
    borderColor: COLORS.warning + '50',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  containerSevere: {
    backgroundColor: COLORS.error + '15',
    borderColor: COLORS.error + '50',
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

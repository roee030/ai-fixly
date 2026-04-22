import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../constants';

interface Props {
  visible: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

/**
 * Surfaces a saved in-progress draft when the user reopens the capture
 * flow. Intentionally a hard modal (not a passive banner) so the user
 * makes a deliberate choice — past UX testing showed the banner got
 * ignored and users started over by default.
 */
export function ResumeDraftModal({ visible, onContinue, onStartNew }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStartNew}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>
            {t('capture.resumeTitle', 'ראינו שהתחלת בקשה')}
          </Text>
          <Text style={styles.body}>
            {t(
              'capture.resumeBody',
              'יש טיוטה שלא סיימת. רוצה להמשיך מאיפה שעצרת?',
            )}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.continueBtn} onPress={onContinue}>
              <Text style={styles.continueText}>
                {t('capture.resumeContinue', 'המשך')}
              </Text>
            </Pressable>
            <Pressable style={styles.startNewBtn} onPress={onStartNew}>
              <Text style={styles.startNewText}>
                {t('capture.resumeStartNew', 'התחל חדש')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.background,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.sm,
  },
  actions: {
    width: '100%',
    gap: SPACING.sm,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  startNewBtn: {
    backgroundColor: 'transparent',
    borderRadius: RADII.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  startNewText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

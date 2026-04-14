import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { feedbackService, SEVERITY_OPTIONS } from '../../services/feedback';
import type { FeedbackSeverity } from '../../services/feedback';
import { useAuthStore } from '../../stores/useAuthStore';
import { COLORS } from '../../constants';
import { Button } from './Button';
import { sanitizeText } from '../../utils/sanitize';

interface Props {
  visible: boolean;
  onClose: () => void;
  screen?: string;
  errorMessage?: string;
}

export function FeedbackModal({ visible, onClose, screen = 'unknown', errorMessage }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState<FeedbackSeverity>('bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        userId: user.uid,
        userPhone: user.phoneNumber || '',
        screen,
        errorMessage,
        freeText: sanitizeText(text.trim(), 2000),
        severity,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setText('');
        onClose();
      }, 1500);
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {submitted ? (
            <View style={styles.success}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.successText}>{t('feedback.thankYou')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{t('feedback.title')}</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Ionicons name="close" size={24} color={COLORS.textTertiary} />
                </Pressable>
              </View>

              {errorMessage && (
                <View style={styles.errorPreview}>
                  <Ionicons name="warning" size={14} color={COLORS.error} />
                  <Text style={styles.errorPreviewText} numberOfLines={2}>{errorMessage}</Text>
                </View>
              )}

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('feedback.placeholder')}
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={4}
                style={styles.input}
              />

              <Text style={styles.severityLabel}>{t('feedback.severity')}</Text>
              <View style={styles.severityRow}>
                {SEVERITY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.severityChip,
                      severity === opt.key && { backgroundColor: opt.color + '20', borderColor: opt.color },
                    ]}
                    onPress={() => setSeverity(opt.key)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={severity === opt.key ? opt.color : COLORS.textTertiary}
                    />
                    <Text style={[
                      styles.severityText,
                      severity === opt.key && { color: opt.color },
                    ]}>
                      {t(`feedback.${opt.key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button
                title={t('feedback.submit')}
                onPress={handleSubmit}
                isLoading={isSubmitting}
                disabled={text.trim().length === 0}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  errorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 10,
  },
  errorPreviewText: {
    color: COLORS.error,
    fontSize: 12,
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  severityLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  success: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.success,
  },
});

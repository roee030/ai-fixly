import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { FeedbackModal } from './FeedbackModal';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { t } = useTranslation();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 16 }}>!</Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8,
          color: COLORS.text,
        }}
      >
        {t('errorFallback.title')}
      </Text>
      <Text
        style={{
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 32,
          color: COLORS.textSecondary,
        }}
      >
        {t('errorFallback.description')}
      </Text>
      <Pressable
        onPress={resetError}
        style={{
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: COLORS.primary,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
          {t('common.retry')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setShowFeedback(true)}
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.textTertiary} />
        <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>{t('common.reportProblem')}</Text>
      </Pressable>
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="error_boundary"
        errorMessage={error.message}
      />
    </View>
  );
}

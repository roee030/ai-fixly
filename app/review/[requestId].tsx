import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { reviewService, REVIEW_CATEGORIES } from '../../src/services/reviews';
import type { ReviewCategory } from '../../src/services/reviews';
import { requestService } from '../../src/services/requests';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';
import { logAction } from '../../src/services/analytics/sessionLogger';
import { sanitizeText, sanitizeNumeric } from '../../src/utils/sanitize';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const user = useAuthStore((s) => s.user);

  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [professionLabel, setProfessionLabel] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<ReviewCategory[]>([]);
  const [comment, setComment] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  // Classification accuracy feedback
  const [classificationCorrect, setClassificationCorrect] = useState<boolean | null>(null);
  const [wrongProfessionNote, setWrongProfessionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    loadRequestData();
  }, [requestId]);

  const loadRequestData = async () => {
    if (!requestId) return;
    try {
      const req = await requestService.getRequest(requestId);
      if (req) {
        setProviderName((req as any).selectedProviderName || t('common.provider'));
        setProviderPhone((req as any).selectedProviderPhone || '');
        // Store the AI-assigned profession for the classification accuracy question
        const aiLabels = (req.aiAnalysis as any)?.professionLabelsHe;
        if (Array.isArray(aiLabels) && aiLabels.length > 0) {
          setProfessionLabel(aiLabels[0]);
        }
      }
      const hasReview = await reviewService.hasReviewForRequest(requestId);
      setAlreadyReviewed(hasReview);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (cat: ReviewCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!user || rating === 0 || !requestId) return;
    setIsSubmitting(true);
    try {
      await reviewService.submitReview({
        requestId,
        userId: user.uid,
        providerPhone,
        providerName,
        rating,
        categories: selectedCategories,
        comment: sanitizeText(comment.trim(), 500),
        pricePaid: pricePaid ? parseInt(sanitizeNumeric(pricePaid), 10) : null,
        classificationCorrect: classificationCorrect,
        wrongProfessionNote: classificationCorrect === false ? sanitizeText(wrongProfessionNote.trim(), 200) : null,
      });
      logAction('review_submitted', 'review', { rating });
      router.replace('/(tabs)/requests');
    } catch (err) {
      console.error('Review submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    logAction('review_skipped', 'review');
    router.replace('/(tabs)/requests');
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (alreadyReviewed) {
    return (
      <ScreenContainer>
        <View style={styles.centeredWithGap}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.alreadyReviewedTitle}>
            {t('review.alreadyReviewed')}
          </Text>
          <Text style={styles.alreadyReviewedSub}>
            {t('review.thankYou')}
          </Text>
          <Button title={t('review.backToRequests')} onPress={() => router.replace('/(tabs)/requests')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            accessibilityLabel="Home"
          >
            <Ionicons name="home-outline" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>{t('review.title')}</Text>
          <Text style={styles.subtitle}>{t('review.rateProvider', { name: providerName })}</Text>
        </View>

        {/* Star rating */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} hitSlop={8}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={44}
                color={star <= rating ? COLORS.warning : COLORS.textTertiary}
              />
            </Pressable>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {RATING_LABEL_KEYS[rating] ? t(RATING_LABEL_KEYS[rating]) : ''}
          </Text>
        )}

        {/* Category chips */}
        {rating > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>{t('review.whatWasGood')}</Text>
            <View style={styles.chipsRow}>
              {REVIEW_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.key);
                return (
                  <Pressable
                    key={cat.key}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleCategory(cat.key)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat.labelHe}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Comment */}
        {rating > 0 && (
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>{t('review.writeComment')}</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('review.commentPlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={styles.commentInput}
            />
          </View>
        )}

        {/* Price paid */}
        {rating > 0 && (
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>{t('review.howMuchPaid')}</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                value={pricePaid}
                onChangeText={(t) => setPricePaid(t.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                style={styles.priceInput}
              />
              <Text style={styles.priceCurrency}>{t('requestDetails.shekel')}</Text>
            </View>
          </View>
        )}

        {/* Classification accuracy feedback */}
        {rating > 0 && professionLabel && (
          <View style={styles.classificationSection}>
            <Text style={styles.classificationQuestion}>
              {t('review.classificationQuestion', { profession: professionLabel })}
            </Text>
            <View style={styles.classificationButtons}>
              <Pressable
                style={[
                  styles.classificationBtn,
                  classificationCorrect === true && styles.classificationBtnYes,
                ]}
                onPress={() => setClassificationCorrect(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={classificationCorrect === true ? '#FFFFFF' : COLORS.success}
                />
                <Text style={[
                  styles.classificationBtnText,
                  classificationCorrect === true && { color: '#FFFFFF' },
                ]}>
                  {t('review.classificationYes')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.classificationBtn,
                  classificationCorrect === false && styles.classificationBtnNo,
                ]}
                onPress={() => setClassificationCorrect(false)}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={classificationCorrect === false ? '#FFFFFF' : COLORS.error}
                />
                <Text style={[
                  styles.classificationBtnText,
                  classificationCorrect === false && { color: '#FFFFFF' },
                ]}>
                  {t('review.classificationNo')}
                </Text>
              </Pressable>
            </View>
            {classificationCorrect === false && (
              <TextInput
                value={wrongProfessionNote}
                onChangeText={setWrongProfessionNote}
                placeholder={t('review.wrongProfessionPlaceholder')}
                placeholderTextColor={COLORS.textTertiary}
                style={styles.wrongProfessionInput}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Button
          title={t('review.submitRating')}
          onPress={handleSubmit}
          isLoading={isSubmitting}
          disabled={rating === 0}
        />
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const RATING_LABEL_KEYS: Record<number, string> = {
  1: 'review.terrible',
  2: 'review.notGood',
  3: 'review.ok',
  4: 'review.veryGood',
  5: 'review.excellent',
};

const styles = StyleSheet.create({
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  centeredWithGap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  alreadyReviewedTitle: {
    color: COLORS.text, fontSize: 18, fontWeight: '600',
  },
  alreadyReviewedSub: {
    color: COLORS.textSecondary, fontSize: 14,
  },
  scroll: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 15,
    color: COLORS.warning,
    fontWeight: '600',
    marginBottom: 24,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceSection: {
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
  },
  priceCurrency: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    paddingVertical: 16,
    gap: 12,
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  classificationSection: {
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  classificationQuestion: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  classificationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  classificationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  classificationBtnYes: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  classificationBtnNo: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  classificationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  wrongProfessionInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

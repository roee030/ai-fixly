import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable, I18nManager, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { authService } from '../../src/services/auth';
import { getFirestore, doc, getDoc, updateDoc } from '../../src/services/firestore/imports';
import { COLORS } from '../../src/constants';

const LANGUAGES = [
  { code: 'he', label: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', label: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', rtl: false },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const currentLang = i18n.language;

  const handleChangeLanguage = async (langCode: string) => {
    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;

    await i18n.changeLanguage(langCode);

    if (Platform.OS !== 'web') {
      const needsRTL = lang.rtl;
      if (I18nManager.isRTL !== needsRTL) {
        I18nManager.forceRTL(needsRTL);
        Alert.alert(
          t('profile.languageChanged'),
          t('profile.restartRequired'),
        );
      }
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
      const exists =
        typeof (userDoc as any).exists === 'function'
          ? (userDoc as any).exists()
          : (userDoc as any).exists;
      if (exists) {
        const data = userDoc.data();
        setDisplayName(data?.displayName || '');
        setAddress(data?.address || '');
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(getFirestore(), 'users', user.uid), {
        displayName: displayName.trim(),
        address: address.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  // Dev-only: clears the onboarding flag and navigates to the onboarding
  // screen so you can review how it looks. AuthGate will route back to
  // tabs once you complete or skip it.
  const handleReplayOnboarding = async () => {
    await useAppStore.getState().setHasSeenOnboarding(false);
    router.replace('/onboarding');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadProfile();
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>{t('profile.title')}</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        {/* Phone (read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.phone')}</Text>
          <View style={styles.fieldReadOnly}>
            <Text style={styles.fieldValue}>{user?.phoneNumber || '-'}</Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
          {isEditing ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.fieldInput}
              placeholder={t('auth.namePlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{displayName || '-'}</Text>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('profile.address')}</Text>
          {isEditing ? (
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.fieldInput}
              placeholder={t('profile.address')}
              placeholderTextColor={COLORS.textTertiary}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{address || t('profile.notSet')}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24, gap: 12 }}>
          {isEditing ? (
            <>
              <Button title={t('common.save')} onPress={handleSave} isLoading={isSaving} />
              <Button title={t('common.cancel')} onPress={handleCancelEdit} variant="ghost" />
            </>
          ) : (
            <Button title={t('profile.editProfile')} onPress={() => setIsEditing(true)} variant="secondary" />
          )}
        </View>

        {/* Language selector */}
        <View style={styles.languageSection}>
          <View style={styles.languageLabelRow}>
            <Ionicons name="language-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.languageLabel}>{t('profile.language')}</Text>
          </View>
          <View style={styles.languageRow}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageBtn,
                  currentLang === lang.code && styles.languageBtnActive,
                ]}
                onPress={() => handleChangeLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  currentLang === lang.code && styles.languageNameActive,
                ]}>
                  {lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Feedback button -- visible to all users */}
        <Pressable style={styles.feedbackButton} onPress={() => setShowFeedback(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
          <Text style={styles.feedbackButtonText}>{t('profile.reportProblem')}</Text>
        </Pressable>

        <FeedbackModal
          visible={showFeedback}
          onClose={() => setShowFeedback(false)}
          screen="profile"
        />

        {/* Dev section -- visible to admins and in dev mode */}
        {(user?.uid === '6sLBVwm1vyWSDjkrK0DffMIJ2i03' || __DEV__) && (
          <View style={styles.devSection}>
            <Text style={styles.devLabel}>{t('profile.devTools')}</Text>
            <Pressable style={styles.devButton} onPress={() => router.push('/(dev)/gallery' as any)}>
              <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
              <Text style={styles.devButtonText}>{t('profile.screenGallery')}</Text>
            </Pressable>
            <Pressable style={styles.devButton} onPress={() => router.push('/(dev)/admin' as any)}>
              <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
              <Text style={styles.devButtonText}>{t('profile.adminDashboard')}</Text>
            </Pressable>
            <Pressable style={styles.devButton} onPress={handleReplayOnboarding}>
              <Ionicons name="refresh-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.devButtonText}>{t('profile.replayOnboarding')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Button title={t('profile.signOut')} onPress={handleSignOut} variant="ghost" style={{ marginTop: 16 }} />

      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push('/legal/terms' as any)}>
          <Text style={styles.legalLink}>{t('profile.termsOfService')}</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>•</Text>
        <Pressable onPress={() => router.push('/legal/privacy' as any)}>
          <Text style={styles.legalLink}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>•</Text>
        <Pressable onPress={() => router.push('/legal/accessibility' as any)}>
          <Text style={styles.legalLink}>{t('profile.accessibility')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldReadOnly: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  languageSection: {
    marginTop: 20,
    marginBottom: 12,
  },
  languageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  languageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  languageBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  languageNameActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 24,
  },
  feedbackButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  devSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  legalLink: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  legalSeparator: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  devButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});

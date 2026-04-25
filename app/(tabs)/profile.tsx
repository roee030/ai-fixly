import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable, I18nManager, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { ScreenContainer } from '../../src/components/layout';
import { Button, VersionBadge } from '../../src/components/ui';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { authService } from '../../src/services/auth';
import { deleteAccountCompletely } from '../../src/services/account/deleteAccount';
import { getFirestore, doc, getDoc, updateDoc } from '../../src/services/firestore/imports';
import { useProviderProfile } from '../../src/hooks/useProviderProfile';
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

  // Apple + Google require a *visible* path to delete the account inside
  // the app itself. We use Alert.alert with the destructive style so the
  // confirm button is red across both platforms. On `requires-recent-login`
  // we nudge the user to sign out and sign in again before retrying — that
  // refreshes Firebase's idea of "recent" without a dedicated re-auth UI.
  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount.title'),
      t('deleteAccount.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('deleteAccount.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountCompletely();
            } catch (err: any) {
              const code = err?.code || '';
              if (code === 'auth/requires-recent-login') {
                Alert.alert(
                  t('deleteAccount.reauthTitle'),
                  t('deleteAccount.reauthBody'),
                  [{ text: t('common.ok'), onPress: () => authService.signOut() }],
                );
              } else {
                Alert.alert(t('common.error'), t('deleteAccount.genericError'));
              }
            }
          },
        },
      ],
    );
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.header}>{t('profile.title')}</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        <ProviderBadge />

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
        <Pressable
          style={styles.feedbackButton}
          onPress={() => setShowFeedback(true)}
          accessibilityRole="button"
          accessibilityLabel={t('profile.reportProblem')}
          accessibilityHint="פתיחת טופס דיווח על תקלה לצוות"
        >
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

        {/* Version + OTA check — helps the owner know when an update
            reached the device, especially for non-visual changes. */}
        <VersionBadge />

        <Button
          title={t('profile.signOut')}
          onPress={handleSignOut}
          variant="ghost"
          style={{ marginTop: 24 }}
        />

        {/* Delete account — required visible path for Apple + Google app-
            store publication. Styled destructive so it's unmistakable. */}
        <Pressable
          onPress={handleDeleteAccount}
          style={styles.deleteAccountButton}
          accessibilityRole="button"
          accessibilityLabel={t('deleteAccount.button')}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteAccountText}>{t('deleteAccount.button')}</Text>
        </Pressable>

        <View style={styles.legalLinks}>
          <Pressable
            onPress={() => router.push('/legal/terms' as any)}
            accessibilityRole="link"
            accessibilityLabel={t('profile.termsOfService')}
          >
            <Text style={styles.legalLink}>{t('profile.termsOfService')}</Text>
          </Pressable>
          <Text style={styles.legalSeparator} accessibilityElementsHidden>
            •
          </Text>
          <Pressable
            onPress={() => router.push('/legal/privacy' as any)}
            accessibilityRole="link"
            accessibilityLabel={t('profile.privacyPolicy')}
          >
            <Text style={styles.legalLink}>{t('profile.privacyPolicy')}</Text>
          </Pressable>
          <Text style={styles.legalSeparator} accessibilityElementsHidden>
            •
          </Text>
          <Pressable
            onPress={() => router.push('/legal/accessibility' as any)}
            accessibilityRole="link"
            accessibilityLabel={t('profile.accessibility')}
          >
            <Text style={styles.legalLink}>{t('profile.accessibility')}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error + '50',
    backgroundColor: COLORS.error + '10',
    marginTop: 12,
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
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
  providerBadgeWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: COLORS.primary + '12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    gap: 8,
  },
  providerBadgeRow: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 8,
  },
  providerBadgeTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700' as any,
  },
  providerBadgeProfession: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700' as any,
  },
  providerBadgeCta: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700' as any,
  },
});

/**
 * Compact provider banner shown at the top of the profile screen for
 * users with `providerProfile` set. Renders nothing for regular customers.
 * Tapping opens the Dashboard tab.
 */
function ProviderBadge() {
  const { t } = useTranslation();
  const { profile, isProvider } = useProviderProfile();
  if (!isProvider || !profile) return null;
  return (
    <Pressable
      style={styles.providerBadgeWrap}
      onPress={() => router.push('/(tabs)/dashboard' as any)}
    >
      <View style={styles.providerBadgeRow}>
        <Ionicons name="briefcase" size={16} color={COLORS.primary} />
        <Text style={styles.providerBadgeTitle}>{t('providerDashboard.profileBadge')}</Text>
      </View>
      <Text style={styles.providerBadgeProfession}>{profile.professionLabelHe}</Text>
      <View style={styles.providerBadgeRow}>
        <Text style={styles.providerBadgeCta}>{t('providerDashboard.profileSeeDashboard')}</Text>
        <Ionicons
          name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
          size={14}
          color={COLORS.primary}
        />
      </View>
    </Pressable>
  );
}

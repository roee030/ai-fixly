import { View, Text, ScrollView, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PROFESSIONS } from '../../src/constants/problemMatrix';
import type { ProfessionKey } from '../../src/constants/problemMatrix';
import { buildProfessionContent, MAIN_CITIES } from '../../src/constants/professionContent';
import { localizeProfession } from '../../src/utils/professionLabel';
import { COLORS, SPACING, RADII, FONT_SIZES } from '../../src/constants';

const BASE_URL = 'https://ai-fixly-web.pages.dev';

export function generateStaticParams() {
  return PROFESSIONS.map((p) => ({ profession: p.key }));
}

// ============================================================================
// JSON-LD builders
// ============================================================================

function buildServiceJsonLd(name: string, canonicalUrl: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${name} — Fixly`,
    description,
    provider: {
      '@type': 'Organization',
      name: 'Fixly',
      url: BASE_URL,
      logo: `${BASE_URL}/icon.png`,
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: name,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: canonicalUrl,
      servicePlatform: 'Web, Android, iOS',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ILS',
      description: 'Free platform — customers pay only the chosen professional.',
    },
  };
}

function buildFaqJsonLd(faq: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

function buildBreadcrumbsJsonLd(name: string, canonicalUrl: string, labels: { home: string; services: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: labels.home, item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: labels.services, item: `${BASE_URL}/services` },
      { '@type': 'ListItem', position: 3, name, item: canonicalUrl },
    ],
  };
}

// ============================================================================
// SEO <head>
// ============================================================================

function SeoHead({
  title,
  metaDescription,
  canonicalUrl,
  language,
  jsonLdBlocks,
}: {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  language: string;
  jsonLdBlocks: object[];
}) {
  if (Platform.OS !== 'web') return null;
  const isRTL = language === 'he' || language === 'ar';

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={language === 'he' ? 'he_IL' : language === 'ar' ? 'ar_IL' : language === 'ru' ? 'ru_RU' : 'en_US'} />
      <meta property="og:site_name" content="Fixly" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <html lang={language} dir={isRTL ? 'rtl' : 'ltr'} />
      {jsonLdBlocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </Head>
  );
}

// ============================================================================
// Inline mini-form (top-of-page conversion surface)
// ============================================================================

function InlineProblemForm({ profLabel, profKey, t }: { profLabel: string; profKey: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const [text, setText] = useState('');
  const isValid = text.trim().length >= 10;

  const handleSubmit = () => {
    if (!isValid) return;
    router.push({
      pathname: '/capture',
      params: { prefillDescription: text.trim(), profession: profKey },
    });
  };

  return (
    <View style={styles.inlineForm}>
      <Text role="heading" aria-level={2} style={styles.inlineFormTitle}>
        {t('servicePage.inlineFormTitleFmt', { name: profLabel })}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('servicePage.inlineFormPlaceholder')}
        placeholderTextColor={COLORS.textTertiary}
        multiline
        numberOfLines={3}
        style={styles.inlineFormInput}
      />
      <Pressable
        style={[styles.ctaButton, !isValid && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={!isValid}
      >
        <Ionicons name="camera" size={20} color="#FFFFFF" />
        <Text style={styles.ctaText}>{t('servicePage.inlineFormSubmit')}</Text>
      </Pressable>
      <Text style={styles.inlineFormNote}>{t('servicePage.inlineFormNote')}</Text>
    </View>
  );
}

// ============================================================================
// Section components
// ============================================================================

function HeroSection({ profLabel, intro, isEmergency, emergencyLabel, heroH1 }: {
  profLabel: string;
  intro: string;
  isEmergency: boolean;
  emergencyLabel: string;
  heroH1: string;
}) {
  return (
    <View style={styles.hero}>
      {isEmergency && (
        <View style={styles.emergencyBadge}>
          <Ionicons name="flash" size={14} color="#FFFFFF" />
          <Text style={styles.emergencyBadgeText}>{emergencyLabel}</Text>
        </View>
      )}
      <View style={styles.heroIcon}>
        <Ionicons name="construct" size={48} color={COLORS.primary} />
      </View>
      <Text role="heading" aria-level={1} style={styles.h1}>
        {heroH1}
      </Text>
      <Text style={styles.heroSubtitle}>{intro}</Text>
    </View>
  );
}

function TrustStrip({ t }: { t: (k: string) => string }) {
  const items = [
    { icon: 'time-outline' as const, label: t('servicePage.trustFast') },
    { icon: 'shield-checkmark-outline' as const, label: t('servicePage.trustVerified') },
    { icon: 'pricetag-outline' as const, label: t('servicePage.trustPrices') },
    { icon: 'heart-outline' as const, label: t('servicePage.trustFree') },
  ];
  return (
    <View style={styles.trustStrip}>
      {items.map((item, i) => (
        <View key={i} style={styles.trustItem}>
          <Ionicons name={item.icon} size={20} color={COLORS.primary} />
          <Text style={styles.trustLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletSection({ title, bullets, icon }: { title: string; bullets: string[]; icon: any }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      <View style={styles.bulletList}>
        {bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name={icon} size={20} color={COLORS.success} />
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommonIssuesSection({ title, issues }: { title: string; issues: string[] }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      <View style={styles.issuesList}>
        {issues.map((issue, i) => (
          <View key={i} style={styles.issueCard}>
            <Ionicons name="ellipse" size={8} color={COLORS.primary} />
            <Text style={styles.issueText}>{issue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PricingSection({ title, intro, hints }: { title: string; intro: string; hints: string[] }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      <View style={styles.pricingBox}>
        <Ionicons name="information-circle" size={18} color={COLORS.info} />
        <Text style={styles.pricingNote}>{intro}</Text>
      </View>
      <View style={styles.bulletList}>
        {hints.map((hint, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.bulletText}>{hint}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HowItWorks({ t }: { t: (k: string) => string }) {
  const steps = [
    { icon: 'camera-outline' as const, title: t('servicePage.step1Title'), desc: t('servicePage.step1Desc') },
    { icon: 'sparkles-outline' as const, title: t('servicePage.step2Title'), desc: t('servicePage.step2Desc') },
    { icon: 'chatbubbles-outline' as const, title: t('servicePage.step3Title'), desc: t('servicePage.step3Desc') },
    { icon: 'checkmark-done-outline' as const, title: t('servicePage.step4Title'), desc: t('servicePage.step4Desc') },
  ];
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{t('servicePage.howItWorksTitle')}</Text>
      <View style={styles.stepsGrid}>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Ionicons name={step.icon} size={28} color={COLORS.primary} />
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FaqSection({ title, faq }: { title: string; faq: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      {faq.map((item, i) => {
        const isOpen = open === i;
        return (
          <Pressable key={i} onPress={() => setOpen(isOpen ? null : i)} style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <Text role="heading" aria-level={3} style={styles.faqQuestion}>{item.q}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
            </View>
            {isOpen && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function CitiesSection({ title, intro }: { title: string; intro: string }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      <Text style={styles.sectionIntro}>{intro}</Text>
      <View style={styles.cityPills}>
        {MAIN_CITIES.map((city) => (
          <Pressable key={city.slug} onPress={() => router.push('/capture')} style={styles.cityPill}>
            <Text style={styles.cityPillText}>{city.he}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RelatedSection({ title, related, t }: { title: string; related: ProfessionKey[]; t: (k: string, o?: Record<string, unknown>) => string }) {
  const items: Array<{ key: string; label: string }> = [];
  for (const key of related) {
    const prof = PROFESSIONS.find((p) => p.key === key);
    if (prof) items.push({ key: prof.key, label: localizeProfession(prof.key, t) });
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>{title}</Text>
      <View style={styles.relatedList}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push({ pathname: '/services/[profession]', params: { profession: item.key } })}
            style={styles.relatedCard}
          >
            <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
            <Text style={styles.relatedText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function ServicePage() {
  const { profession } = useLocalSearchParams<{ profession: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'he';
  const prof = PROFESSIONS.find((p) => p.key === profession);

  if (!prof) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>{t('servicePage.notFound')}</Text>
      </View>
    );
  }

  const profLabel = localizeProfession(prof.key, t);
  const content = buildProfessionContent(prof.key as ProfessionKey, profLabel, t, language);
  const canonicalUrl = `${BASE_URL}/services/${profession}`;
  const title = t('servicePage.titleFmt', { name: profLabel });
  const metaDescription = t('servicePage.metaDescFmt', { name: profLabel }).slice(0, 158);
  const heroH1 = t('servicePage.heroH1Fmt', { name: profLabel });

  const jsonLdBlocks = [
    buildServiceJsonLd(profLabel, canonicalUrl, content.intro),
    buildFaqJsonLd(content.faq),
    buildBreadcrumbsJsonLd(profLabel, canonicalUrl, {
      home: t('tabs.home'),
      services: t('profile.title'),
    }),
  ];

  return (
    <>
      <SeoHead
        title={title}
        metaDescription={metaDescription}
        canonicalUrl={canonicalUrl}
        language={language}
        jsonLdBlocks={jsonLdBlocks}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.navTop}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={styles.navBtn}
            accessibilityLabel={t('servicePage.backHome')}
          >
            {/* A small text fallback + icon: if the Ionicons font ever fails
                to load, the arrow still shows. Home icon was rendering as an
                empty box in some environments. */}
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </Pressable>
        </View>

        <HeroSection
          profLabel={profLabel}
          intro={content.intro}
          isEmergency={!!content.isEmergencyService}
          emergencyLabel={t('servicePage.emergencyBadge')}
          heroH1={heroH1}
        />
        <TrustStrip t={t} />

        <InlineProblemForm profLabel={profLabel} profKey={prof.key} t={t} />

        <BulletSection title={t('servicePage.whyUsTitle')} bullets={content.whyUs} icon="checkmark-circle" />
        <CommonIssuesSection title={t('servicePage.commonIssuesTitleFmt', { name: profLabel })} issues={content.commonIssues} />
        <HowItWorks t={t} />
        <PricingSection
          title={t('servicePage.pricingTitleFmt', { name: profLabel })}
          intro={t('servicePage.pricingIntro')}
          hints={content.pricingHints}
        />

        <View style={{ marginVertical: SPACING.lg }}>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/capture')}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>{t('servicePage.secondaryCtaFmt', { name: profLabel })}</Text>
          </Pressable>
        </View>

        <FaqSection title={t('servicePage.faqTitle')} faq={content.faq} />
        <CitiesSection
          title={t('servicePage.citiesTitleFmt', { name: profLabel })}
          intro={t('servicePage.citiesIntroFmt', { name: profLabel })}
        />

        {content.relatedProfessions && content.relatedProfessions.length > 0 && (
          <RelatedSection title={t('servicePage.relatedTitle')} related={content.relatedProfessions} t={t} />
        )}

        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>{t('servicePage.finalCtaTitleFmt', { name: profLabel })}</Text>
          <Text style={styles.finalCtaSubtitle}>{t('servicePage.finalCtaSubtitle')}</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/capture')}>
            <Text style={styles.ctaText}>{t('servicePage.finalCtaButton')}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('servicePage.footer')}</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  notFound: { color: COLORS.text, fontSize: FONT_SIZES.lg, textAlign: 'center', marginTop: 100 },

  navTop: { paddingTop: SPACING.md },
  navBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  hero: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  h1: {
    color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: '700',
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    textAlign: 'center', lineHeight: 24, maxWidth: 560, marginBottom: SPACING.lg,
  },
  emergencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, marginBottom: SPACING.md,
  },
  emergencyBadgeText: { color: '#FFFFFF', fontSize: FONT_SIZES.xs, fontWeight: '700' },

  trustStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.surface, borderRadius: RADII.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  trustItem: { alignItems: 'center', gap: 4, flex: 1 },
  trustLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600' },

  inlineForm: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1, borderColor: COLORS.primary + '30',
    borderRadius: RADII.lg, padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  inlineFormTitle: {
    color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '700',
    marginBottom: SPACING.md,
  },
  inlineFormInput: {
    backgroundColor: COLORS.background, color: COLORS.text,
    borderRadius: RADII.md, padding: SPACING.md,
    fontSize: FONT_SIZES.md, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  inlineFormNote: {
    color: COLORS.textTertiary, fontSize: FONT_SIZES.xs,
    textAlign: 'center', marginTop: SPACING.sm,
  },

  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: SPACING.lg,
    borderRadius: RADII.lg, alignSelf: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '700' },

  section: { marginVertical: SPACING.lg },
  h2: {
    color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: '700',
    marginBottom: SPACING.md,
  },
  sectionIntro: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md, lineHeight: 22,
  },

  bulletList: { gap: SPACING.sm },
  bulletRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADII.md,
  },
  bulletText: {
    color: COLORS.text, fontSize: FONT_SIZES.md, flex: 1, lineHeight: 22,
  },

  issuesList: { gap: SPACING.xs },
  issueCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
  },
  issueText: { color: COLORS.text, fontSize: FONT_SIZES.md, flex: 1 },

  pricingBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.info + '15', padding: SPACING.md,
    borderRadius: RADII.md, marginBottom: SPACING.md,
  },
  pricingNote: { color: COLORS.text, fontSize: FONT_SIZES.sm, flex: 1, lineHeight: 20 },

  stepsGrid: { gap: SPACING.md },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADII.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#FFFFFF', fontSize: FONT_SIZES.sm, fontWeight: '700' },
  stepTitle: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '700' },
  stepDesc: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, flex: 1, lineHeight: 20 },

  faqItem: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  faqQuestion: {
    color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '600', flex: 1,
  },
  faqAnswer: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm, lineHeight: 22,
  },

  cityPills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cityPill: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  cityPillText: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  relatedList: { gap: SPACING.sm },
  relatedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: RADII.md, borderWidth: 1, borderColor: COLORS.border,
  },
  relatedText: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '600' },

  finalCta: {
    alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.xl, borderRadius: RADII.lg,
    marginVertical: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  finalCtaTitle: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: '700', textAlign: 'center' },
  finalCtaSubtitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    textAlign: 'center', lineHeight: 22,
  },

  footer: {
    paddingVertical: SPACING.lg, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.lg,
  },
  footerText: { color: COLORS.textTertiary, fontSize: FONT_SIZES.sm },
});

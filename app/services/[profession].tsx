import { View, Text, ScrollView, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { PROFESSIONS } from '../../src/constants/problemMatrix';
import type { ProfessionKey } from '../../src/constants/problemMatrix';
import { buildProfessionContent, MAIN_CITIES } from '../../src/constants/professionContent';
import { COLORS, SPACING, RADII, FONT_SIZES } from '../../src/constants';

const BASE_URL = 'https://ai-fixly-web.pages.dev';

export function generateStaticParams() {
  return PROFESSIONS.map((p) => ({ profession: p.key }));
}

// ============================================================================
// JSON-LD builders
// ============================================================================

/**
 * Service + LocalBusiness JSON-LD. Google uses this to render rich results
 * and to understand the site as a service-broker.
 */
function buildServiceJsonLd(profLabel: string, canonicalUrl: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${profLabel} — ai-fixly`,
    description,
    provider: {
      '@type': 'Organization',
      name: 'ai-fixly',
      url: BASE_URL,
      logo: `${BASE_URL}/icon.png`,
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: profLabel,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: canonicalUrl,
      servicePlatform: 'Web, Android, iOS',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ILS',
      description: 'השירות חינמי — משלמים רק לבעל המקצוע שנבחר',
    },
  };
}

/**
 * FAQPage JSON-LD. Each Q&A turns into a rich-snippet expandable row on
 * the Google search results page (when Google chooses to render it).
 */
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

/** Breadcrumbs JSON-LD — helps Google draw the nav path above the result. */
function buildBreadcrumbsJsonLd(profLabel: string, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'בית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'שירותים', item: `${BASE_URL}/services` },
      { '@type': 'ListItem', position: 3, name: profLabel, item: canonicalUrl },
    ],
  };
}

// ============================================================================
// SEO Head
// ============================================================================

function SeoHead({
  profLabel,
  canonicalUrl,
  metaDescription,
  jsonLdBlocks,
}: {
  profLabel: string;
  canonicalUrl: string;
  metaDescription: string;
  jsonLdBlocks: object[];
}) {
  if (Platform.OS !== 'web') return null;

  const title = `${profLabel} באזורך — הצעות מחיר תוך דקות | ai-fixly`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:site_name" content="ai-fixly" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <html lang="he" dir="rtl" />
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
// Inline mini-form (prominent on-page CTA)
// ============================================================================

/**
 * One-field textarea that captures the user's problem description and then
 * hands off to the full /capture flow with the description pre-filled.
 * This turns the SEO landing page into an actual conversion surface.
 */
function InlineProblemForm({ profLabel, profKey }: { profLabel: string; profKey: string }) {
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
        {`תאר את הבעיה — קבל ${profLabel} תוך דקות`}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={`למשל: נזילה מהברז במטבח, התחילה הבוקר ולא מפסיקה`}
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
        <Text style={styles.ctaText}>המשך עם תמונה וקבל הצעות</Text>
      </Pressable>
      <Text style={styles.inlineFormNote}>
        ללא עלות • ללא התחייבות • הצעות מבעלי מקצוע מדורגים באזור שלך
      </Text>
    </View>
  );
}

// ============================================================================
// Content sections
// ============================================================================

function HeroSection({ profLabel, intro, isEmergency }: { profLabel: string; intro: string; isEmergency: boolean }) {
  return (
    <View style={styles.hero}>
      {isEmergency && (
        <View style={styles.emergencyBadge}>
          <Ionicons name="flash" size={14} color="#FFFFFF" />
          <Text style={styles.emergencyBadgeText}>שירות 24/7 זמין</Text>
        </View>
      )}
      <View style={styles.heroIcon}>
        <Ionicons name="construct" size={48} color={COLORS.primary} />
      </View>
      <Text role="heading" aria-level={1} style={styles.h1}>
        {profLabel} באזורך
      </Text>
      <Text style={styles.heroSubtitle}>{intro}</Text>
    </View>
  );
}

function WhyUsSection({ points }: { points: string[] }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        למה ai-fixly?
      </Text>
      <View style={styles.bulletList}>
        {points.map((point, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.bulletText}>{point}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommonIssuesSection({ issues, profLabel }: { issues: string[]; profLabel: string }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        {`מה ${profLabel} פותר?`}
      </Text>
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

function PricingSection({ hints, profLabel }: { hints: string[]; profLabel: string }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        {`כמה עולה ${profLabel}?`}
      </Text>
      <View style={styles.pricingBox}>
        <Ionicons name="information-circle" size={18} color={COLORS.info} />
        <Text style={styles.pricingNote}>
          אנחנו לא נותנים מחירון קבוע — במקום זה, בעלי המקצוע נותנים הצעת מחיר ספציפית לבעיה שלך.
        </Text>
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

function HowItWorks() {
  const steps = [
    { icon: 'camera-outline' as const, title: 'צלם את הבעיה', desc: 'תמונה אחת או סרטון — וגם תיאור קצר' },
    { icon: 'sparkles-outline' as const, title: 'ה-AI מזהה', desc: 'מחפש את בעלי המקצוע המתאימים באזורך' },
    { icon: 'chatbubbles-outline' as const, title: 'קבל הצעות', desc: 'מחיר וזמן הגעה — ישיר ב-WhatsApp של בעל המקצוע' },
    { icon: 'checkmark-done-outline' as const, title: 'בחר את הטוב ביותר', desc: 'השווה מחירים ודירוגים, סגור ברגע' },
  ];

  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        איך זה עובד?
      </Text>
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

function FaqSection({ faq }: { faq: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        שאלות נפוצות
      </Text>
      {faq.map((item, i) => {
        const isOpen = open === i;
        return (
          <Pressable
            key={i}
            onPress={() => setOpen(isOpen ? null : i)}
            style={styles.faqItem}
          >
            <View style={styles.faqHeader}>
              <Text role="heading" aria-level={3} style={styles.faqQuestion}>
                {item.q}
              </Text>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </View>
            {isOpen && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function CitiesSection({ profLabel }: { profLabel: string }) {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        {`${profLabel} באזורים שלנו`}
      </Text>
      <Text style={styles.sectionIntro}>
        {`אנחנו פעילים בכל מרכז הארץ. לחץ על עיר כדי למצוא ${profLabel} באזורך.`}
      </Text>
      <View style={styles.cityPills}>
        {MAIN_CITIES.map((city) => (
          <Pressable
            key={city.slug}
            onPress={() => router.push('/capture')}
            style={styles.cityPill}
          >
            <Text style={styles.cityPillText}>{city.he}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RelatedSection({ related }: { related: ProfessionKey[] }) {
  const items = related
    .map((key) => PROFESSIONS.find((p) => p.key === key))
    .filter(Boolean) as Array<{ key: string; labelHe: string }>;

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        בעלי מקצוע נוספים שאולי תצטרך
      </Text>
      <View style={styles.relatedList}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push({ pathname: '/services/[profession]', params: { profession: item.key } })}
            style={styles.relatedCard}
          >
            <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
            <Text style={styles.relatedText}>{item.labelHe}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TrustStrip() {
  const items = [
    { icon: 'time-outline' as const, label: 'תוך דקות' },
    { icon: 'shield-checkmark-outline' as const, label: 'מאומתים' },
    { icon: 'pricetag-outline' as const, label: 'השוואת מחירים' },
    { icon: 'heart-outline' as const, label: 'ללא עלות' },
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

// ============================================================================
// Page
// ============================================================================

export default function ServicePage() {
  const { profession } = useLocalSearchParams<{ profession: string }>();
  const prof = PROFESSIONS.find((p) => p.key === profession);

  if (!prof) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>שירות לא נמצא</Text>
      </View>
    );
  }

  const content = buildProfessionContent(prof.key as ProfessionKey, prof.labelHe);
  const canonicalUrl = `${BASE_URL}/services/${profession}`;
  const metaDescription = `${prof.labelHe} באזורך דרך ai-fixly — צלם את הבעיה, קבל הצעות מחיר מבעלי מקצוע מדורגים תוך דקות. ללא עלות ללא התחייבות. ${content.intro}`.slice(0, 158);

  const jsonLdBlocks = [
    buildServiceJsonLd(prof.labelHe, canonicalUrl, content.intro),
    buildFaqJsonLd(content.faq),
    buildBreadcrumbsJsonLd(prof.labelHe, canonicalUrl),
  ];

  return (
    <>
      <SeoHead
        profLabel={prof.labelHe}
        canonicalUrl={canonicalUrl}
        metaDescription={metaDescription}
        jsonLdBlocks={jsonLdBlocks}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.navTop}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={styles.navBtn}
            accessibilityLabel="חזרה לדף הבית"
          >
            <Ionicons name="home-outline" size={22} color={COLORS.text} />
          </Pressable>
        </View>

        <HeroSection profLabel={prof.labelHe} intro={content.intro} isEmergency={!!content.isEmergencyService} />
        <TrustStrip />

        {/* Primary conversion point — inline form at the top */}
        <InlineProblemForm profLabel={prof.labelHe} profKey={prof.key} />

        <WhyUsSection points={content.whyUs} />
        <CommonIssuesSection issues={content.commonIssues} profLabel={prof.labelHe} />
        <HowItWorks />
        <PricingSection hints={content.pricingHints} profLabel={prof.labelHe} />

        {/* Secondary CTA — after the "how it works" section */}
        <View style={{ marginVertical: SPACING.lg }}>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/capture')}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>{`צלם את הבעיה וקבל הצעות מ${prof.labelHe}`}</Text>
          </Pressable>
        </View>

        <FaqSection faq={content.faq} />
        <CitiesSection profLabel={prof.labelHe} />

        {content.relatedProfessions && content.relatedProfessions.length > 0 && (
          <RelatedSection related={content.relatedProfessions} />
        )}

        {/* Final conversion CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>{`מחפש ${prof.labelHe}? התחל עכשיו`}</Text>
          <Text style={styles.finalCtaSubtitle}>
            תמונה אחת + תיאור קצר → הצעות מבעלי מקצוע באזורך תוך דקות
          </Text>
          <Pressable style={styles.ctaButton} onPress={() => router.push('/capture')}>
            <Text style={styles.ctaText}>{'התחל עכשיו ←'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ai-fixly — הדרך הקלה למצוא בעל מקצוע</Text>
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  h1: {
    color: COLORS.text, fontSize: FONT_SIZES.xxl, fontWeight: '700',
    textAlign: 'center', writingDirection: 'rtl', marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    textAlign: 'center', writingDirection: 'rtl',
    lineHeight: 24, maxWidth: 560, marginBottom: SPACING.lg,
  },
  emergencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, marginBottom: SPACING.md,
  },
  emergencyBadgeText: { color: '#FFFFFF', fontSize: FONT_SIZES.xs, fontWeight: '700' },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.surface, borderRadius: RADII.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  trustItem: { alignItems: 'center', gap: 4, flex: 1 },
  trustLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Inline form
  inlineForm: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1, borderColor: COLORS.primary + '30',
    borderRadius: RADII.lg, padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  inlineFormTitle: {
    color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '700',
    textAlign: 'right', writingDirection: 'rtl', marginBottom: SPACING.md,
  },
  inlineFormInput: {
    backgroundColor: COLORS.background, color: COLORS.text,
    borderRadius: RADII.md, padding: SPACING.md,
    fontSize: FONT_SIZES.md, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: COLORS.border,
    writingDirection: 'rtl', textAlign: 'right',
    marginBottom: SPACING.md,
  },
  inlineFormNote: {
    color: COLORS.textTertiary, fontSize: FONT_SIZES.xs,
    textAlign: 'center', marginTop: SPACING.sm,
  },

  // CTA button (shared)
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: SPACING.lg,
    borderRadius: RADII.lg, alignSelf: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: FONT_SIZES.md, fontWeight: '700' },

  // Sections
  section: { marginVertical: SPACING.lg },
  h2: {
    color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: '700',
    writingDirection: 'rtl', textAlign: 'right',
    marginBottom: SPACING.md,
  },
  sectionIntro: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    writingDirection: 'rtl', textAlign: 'right', marginBottom: SPACING.md, lineHeight: 22,
  },

  bulletList: { gap: SPACING.sm },
  bulletRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADII.md,
  },
  bulletText: {
    color: COLORS.text, fontSize: FONT_SIZES.md,
    writingDirection: 'rtl', flex: 1, lineHeight: 22,
  },

  issuesList: { gap: SPACING.xs },
  issueCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
  },
  issueText: {
    color: COLORS.text, fontSize: FONT_SIZES.md,
    writingDirection: 'rtl', flex: 1,
  },

  pricingBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.info + '15', padding: SPACING.md,
    borderRadius: RADII.md, marginBottom: SPACING.md,
  },
  pricingNote: {
    color: COLORS.text, fontSize: FONT_SIZES.sm,
    writingDirection: 'rtl', flex: 1, lineHeight: 20,
  },

  // How it works
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
  stepTitle: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '700', writingDirection: 'rtl' },
  stepDesc: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.sm,
    writingDirection: 'rtl', flex: 1, lineHeight: 20,
  },

  // FAQ
  faqItem: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  faqQuestion: {
    color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '600',
    writingDirection: 'rtl', textAlign: 'right', flex: 1,
  },
  faqAnswer: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.sm,
    writingDirection: 'rtl', textAlign: 'right',
    marginTop: SPACING.sm, lineHeight: 22,
  },

  // Cities
  cityPills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cityPill: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  cityPillText: { color: COLORS.text, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // Related
  relatedList: { gap: SPACING.sm },
  relatedCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderRadius: RADII.md, borderWidth: 1, borderColor: COLORS.border,
  },
  relatedText: {
    color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '600',
    writingDirection: 'rtl',
  },

  // Final CTA
  finalCta: {
    alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary + '08',
    padding: SPACING.xl, borderRadius: RADII.lg,
    marginVertical: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  finalCtaTitle: {
    color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: '700',
    textAlign: 'center', writingDirection: 'rtl',
  },
  finalCtaSubtitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZES.md,
    textAlign: 'center', writingDirection: 'rtl', lineHeight: 22,
  },

  // Footer
  footer: {
    paddingVertical: SPACING.lg, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.lg,
  },
  footerText: { color: COLORS.textTertiary, fontSize: FONT_SIZES.sm },
});

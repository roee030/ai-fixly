import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { PROFESSIONS, PROBLEM_MATRIX } from '../../src/constants/problemMatrix';
import type { ProfessionKey } from '../../src/constants/problemMatrix';
import { COLORS, SPACING, RADII, FONT_SIZES } from '../../src/constants';

const BASE_URL = 'https://aifixly.co.il';

export function generateStaticParams() {
  return PROFESSIONS.map(p => ({ profession: p.key }));
}

function buildJsonLd(profLabel: string, problemCount: number, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${profLabel} - ai-fixly`,
    description: `${profLabel} באזורך. ${problemCount} סוגי בעיות שאנחנו פותרים. קבל הצעות מחיר תוך דקות.`,
    provider: {
      '@type': 'Organization',
      name: 'ai-fixly',
      url: BASE_URL,
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: profLabel,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: canonicalUrl,
      servicePlatform: 'Web, Android',
    },
  };
}

function getProblemsForProfession(professionKey: string) {
  return PROBLEM_MATRIX.flatMap(d => d.problems).filter(p =>
    p.professions.includes(professionKey as ProfessionKey),
  );
}

function SeoHead({ profLabel, canonicalUrl, problemCount, jsonLd }: {
  profLabel: string;
  canonicalUrl: string;
  problemCount: number;
  jsonLd: object;
}) {
  if (Platform.OS !== 'web') return null;

  return (
    <Head>
      <title>{`${profLabel} באזורך - ai-fixly | מצא בעל מקצוע`}</title>
      <meta
        name="description"
        content={`מחפש ${profLabel}? ai-fixly מחבר אותך עם בעלי מקצוע מובילים באזור שלך. ${problemCount} סוגי בעיות. קבל הצעות מחיר תוך דקות.`}
      />
      <meta property="og:title" content={`${profLabel} באזורך - ai-fixly`} />
      <meta
        property="og:description"
        content={`צלם את הבעיה, קבל הצעות מ${profLabel}ים מובילים`}
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="he_IL" />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content="index, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}

const HOW_IT_WORKS_STEPS = [
  { num: '1', icon: 'camera-outline' as const, text: 'צלם את הבעיה' },
  { num: '2', icon: 'sparkles-outline' as const, text: 'ה-AI שלנו מזהה מה צריך' },
  { num: '3', icon: 'people-outline' as const, text: 'בעלי מקצוע שולחים הצעות' },
  { num: '4', icon: 'checkmark-done-outline' as const, text: 'בחר את הטוב ביותר' },
];

function HeroSection({ profLabel, problemCount }: {
  profLabel: string;
  problemCount: number;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <Ionicons name="construct" size={48} color={COLORS.primary} />
      </View>
      <Text role="heading" aria-level={1} style={styles.h1}>
        {profLabel} באזורך
      </Text>
      <Text style={styles.heroSubtitle}>
        {`צלם את הבעיה ואנחנו נמצא לך ${profLabel} מתאים. ${problemCount} סוגי בעיות, הצעות תוך דקות.`}
      </Text>
      <Pressable style={styles.ctaButton} onPress={() => router.push('/capture')}>
        <Ionicons name="camera" size={22} color="#FFFFFF" />
        <Text style={styles.ctaText}>דווח על בעיה עכשיו</Text>
      </Pressable>
    </View>
  );
}

function ProblemsList({ problems }: {
  problems: ReturnType<typeof getProblemsForProfession>;
}) {
  const urgentCount = problems.filter(p => p.urgency === 'urgent').length;

  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        {`בעיות שאנחנו פותרים (${problems.length})`}
      </Text>
      {urgentCount > 0 && (
        <Text style={styles.urgentNote}>
          {`${urgentCount} בעיות דחופות - מגיעים אליך מהר`}
        </Text>
      )}
      <View style={styles.problemGrid}>
        {problems.map(p => (
          <View key={p.id} style={styles.problemCard}>
            <Ionicons
              name={p.urgency === 'urgent' ? 'alert-circle' : 'checkmark-circle'}
              size={18}
              color={p.urgency === 'urgent' ? COLORS.error : COLORS.success}
            />
            <Text style={styles.problemText}>{p.descriptionHe}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HowItWorks() {
  return (
    <View style={styles.section}>
      <Text role="heading" aria-level={2} style={styles.h2}>
        איך זה עובד?
      </Text>
      <View style={styles.steps}>
        {HOW_IT_WORKS_STEPS.map(step => (
          <View key={step.num} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.num}</Text>
            </View>
            <Ionicons name={step.icon} size={24} color={COLORS.primary} />
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ServicePage() {
  const { profession } = useLocalSearchParams<{ profession: string }>();
  const prof = PROFESSIONS.find(p => p.key === profession);

  if (!prof) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>שירות לא נמצא</Text>
      </View>
    );
  }

  const problems = getProblemsForProfession(profession);
  const canonicalUrl = `${BASE_URL}/services/${profession}`;
  const jsonLd = buildJsonLd(prof.labelHe, problems.length, canonicalUrl);

  return (
    <>
      <SeoHead
        profLabel={prof.labelHe}
        canonicalUrl={canonicalUrl}
        problemCount={problems.length}
        jsonLd={jsonLd}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={{ paddingTop: SPACING.md }}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Home"
          >
            <Ionicons name="home-outline" size={22} color={COLORS.text} />
          </Pressable>
        </View>
        <HeroSection profLabel={prof.labelHe} problemCount={problems.length} />
        <ProblemsList problems={problems} />
        <HowItWorks />

        <Pressable
          style={[styles.ctaButton, { marginBottom: 48 }]}
          onPress={() => router.push('/capture')}
        >
          <Text style={styles.ctaText}>{'בוא נתחיל \u2192'}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ai-fixly - הדרך הקלה למצוא בעל מקצוע
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
  },
  notFound: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    marginTop: 100,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  h1: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 24,
    maxWidth: 480,
    marginBottom: SPACING.lg,
  },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.lg,
    alignSelf: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  h2: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  urgentNote: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.sm,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: SPACING.md,
  },

  // Problem grid
  problemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  problemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    minWidth: '45%',
    flexGrow: 1,
  },
  problemText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    writingDirection: 'rtl',
    flexShrink: 1,
  },

  // How it works
  steps: {
    gap: SPACING.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADII.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  stepText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    writingDirection: 'rtl',
    flex: 1,
  },

  // Footer
  footer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.lg,
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: FONT_SIZES.sm,
  },
});

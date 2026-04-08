import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{'צריך עזרה בתיקון?'}</Text>
          <Text style={styles.heroSubtitle}>
            {'דווח על תקלה בתוך שניות\nבעזרת בינה מלאכותית'}
          </Text>
        </View>

        {/* Main CTA */}
        <Pressable onPress={() => router.push('/capture')} style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="camera-outline" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.ctaText}>דווח על תקלה</Text>
        </Pressable>

        {/* Quick info cards */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="flash-outline" size={24} color={COLORS.warning} />
            <Text style={styles.infoTitle}>מהיר</Text>
            <Text style={styles.infoDesc}>תשובות תוך דקות</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.success} />
            <Text style={styles.infoTitle}>אמין</Text>
            <Text style={styles.infoDesc}>בעלי מקצוע מאומתים</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="pricetag-outline" size={24} color={COLORS.info} />
            <Text style={styles.infoTitle}>הוגן</Text>
            <Text style={styles.infoDesc}>השוואת מחירים</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 40,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  ctaIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

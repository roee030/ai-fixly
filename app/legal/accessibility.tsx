import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function AccessibilityScreen() {
  return (
    <ScreenContainer maxWidth={720}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>
        </View>
        <Text style={styles.title}>הצהרת נגישות</Text>
        <Text style={styles.updated}>עודכן לאחרונה: אפריל 2026</Text>

        <Text style={styles.sectionTitle}>1. מחויבות לנגישות</Text>
        <Text style={styles.paragraph}>
          ai-fixly מחויבת להנגשת האפליקציה לכלל המשתמשים, כולל אנשים עם מוגבלויות. אנו פועלים באופן מתמיד לשפר את הנגישות ולהבטיח חוויית שימוש שוויונית לכולם.
        </Text>

        <Text style={styles.sectionTitle}>2. סטנדרטים</Text>
        <Text style={styles.paragraph}>
          האפליקציה שואפת לעמוד בדרישות תקן WCAG 2.1 ברמה AA. אנו מבצעים בדיקות נגישות תקופתיות ומטפלים בממצאים באופן שוטף.
        </Text>

        <Text style={styles.sectionTitle}>3. מאפייני נגישות</Text>
        <Text style={styles.paragraph}>
          האפליקציה תומכת בתצוגה מימין לשמאל (RTL) עבור עברית. גודל מינימלי של אזורי מגע הוא 44 פיקסלים. כל האלמנטים כוללים תוויות לקורא מסך. יחסי ניגודיות צבע עומדים בדרישות תקן WCAG.
        </Text>

        <Text style={styles.sectionTitle}>4. בעיות ידועות</Text>
        <Text style={styles.paragraph}>
          אנו מודעים לכך שחלק מהתכנים עשויים שלא לעמוד עדיין בכל דרישות הנגישות. אנו עובדים באופן מתמיד לתקן בעיות שמתגלות ולשפר את חוויית המשתמש.
        </Text>

        <Text style={styles.sectionTitle}>5. משוב נגישות</Text>
        <Text style={styles.paragraph}>
          אם נתקלת בבעיית נגישות או שיש לך הצעות לשיפור, נשמח לשמוע ממך. ניתן לפנות אלינו דרך כפתור &quot;דווח על בעיה&quot; באפליקציה.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 24, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  updated: { fontSize: 13, color: COLORS.textTertiary, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 24, marginBottom: 8 },
  paragraph: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 12 },
});

import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function TermsScreen() {
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
        <Text style={styles.title}>תנאי שימוש</Text>
        <Text style={styles.updated}>עודכן לאחרונה: אפריל 2026</Text>

        <Text style={styles.sectionTitle}>1. הגדרות</Text>
        <Text style={styles.paragraph}>
          &quot;Fixly&quot; (להלן: &quot;האפליקציה&quot; או &quot;השירות&quot;) היא פלטפורמה המחברת בין לקוחות הזקוקים לשירותי בית לבין בעלי מקצוע באזורם. השירות מופעל על ידי Fixly.
        </Text>

        <Text style={styles.sectionTitle}>2. תיאור השירות</Text>
        <Text style={styles.paragraph}>
          האפליקציה מאפשרת למשתמשים לצלם תמונה או סרטון של בעיה ביתית, לקבל ניתוח אוטומטי באמצעות בינה מלאכותית, ולקבל הצעות מחיר מבעלי מקצוע מקומיים. Fixly משמשת כמתווכת בלבד ואינה מספקת בעצמה שירותי תיקון או תחזוקה.
        </Text>

        <Text style={styles.sectionTitle}>3. אחריות</Text>
        <Text style={styles.paragraph}>
          Fixly אינה אחראית לאיכות העבודה של בעלי המקצוע, למחירים שנקבעים, או לכל נזק שנגרם כתוצאה משימוש בשירות. האחריות על בחירת בעל מקצוע ועל ההתקשרות עימו היא של המשתמש בלבד.
        </Text>

        <Text style={styles.sectionTitle}>4. פרטיות</Text>
        <Text style={styles.paragraph}>
          אנו אוספים מידע הכרחי לתפעול השירות: מספר טלפון, מיקום, תמונות/סרטונים של הבעיה, ותקשורת עם בעלי מקצוע. ראה את מדיניות הפרטיות שלנו לפרטים נוספים.
        </Text>

        <Text style={styles.sectionTitle}>5. שימוש הולם</Text>
        <Text style={styles.paragraph}>
          המשתמש מתחייב להשתמש בשירות למטרות חוקיות בלבד, לא להעלות תוכן פוגעני או מטעה, ולא לנסות לעקוף את מנגנוני ההגנה של האפליקציה.
        </Text>

        <Text style={styles.sectionTitle}>6. שינויים בתנאים</Text>
        <Text style={styles.paragraph}>
          Fixly שומרת לעצמה את הזכות לעדכן תנאים אלה בכל עת. המשך השימוש בשירות לאחר עדכון התנאים מהווה הסכמה לתנאים המעודכנים.
        </Text>

        <Text style={styles.sectionTitle}>7. יצירת קשר</Text>
        <Text style={styles.paragraph}>
          לשאלות בנוגע לתנאי השימוש, ניתן לפנות אלינו דרך כפתור &quot;דווח על בעיה&quot; באפליקציה.
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

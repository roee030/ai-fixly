import { ScrollView, Text, Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function PrivacyScreen() {
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
        <Text style={styles.title}>מדיניות פרטיות</Text>
        <Text style={styles.updated}>עודכן לאחרונה: אפריל 2026</Text>

        <Text style={styles.sectionTitle}>1. מידע שאנו אוספים</Text>
        <Text style={styles.paragraph}>
          אנו אוספים את המידע הבא: מספר טלפון (לצורך הזדהות), מיקום גיאוגרפי (למציאת בעלי מקצוע באזורך), תמונות וסרטונים של הבעיה (לניתוח AI ושליחה לבעלי מקצוע), ותקשורת עם בעלי מקצוע דרך המערכת.
        </Text>

        <Text style={styles.sectionTitle}>2. כיצד אנו משתמשים במידע</Text>
        <Text style={styles.paragraph}>
          המידע משמש אותנו לצורך: התאמת בעלי מקצוע לבקשתך, שליחת התראות ועדכונים על הבקשות שלך, שיפור השירות וניתוח סטטיסטי, ואבטחת המערכת ומניעת שימוש לרעה.
        </Text>

        <Text style={styles.sectionTitle}>3. שיתוף מידע</Text>
        <Text style={styles.paragraph}>
          פרטי הלקוח (שם, טלפון, כתובת) נחשפים לבעל המקצוע רק לאחר שהלקוח בוחר בו. אנו לא מוכרים מידע אישי לצדדים שלישיים. מידע אנונימי ומצרפי עשוי לשמש לצורכי ניתוח ושיפור השירות.
        </Text>

        <Text style={styles.sectionTitle}>4. אבטחת מידע</Text>
        <Text style={styles.paragraph}>
          המידע מאוחסן בשרתי Firebase מאובטחים עם הצפנה. כללי אבטחה מחמירים מגבילים גישה למידע רגיש. כל התקשורת מוצפנת באמצעות HTTPS.
        </Text>

        <Text style={styles.sectionTitle}>5. זכויותיך</Text>
        <Text style={styles.paragraph}>
          באפשרותך לבקש מחיקת חשבונך ומידע אישי, לקבל העתק של המידע שאנו מחזיקים עליך, ולפנות אלינו בכל שאלה בנוגע לפרטיותך.
        </Text>

        <Text style={styles.sectionTitle}>6. עוגיות</Text>
        <Text style={styles.paragraph}>
          בגרסת האינטרנט אנו משתמשים בעוגיות לצורך שמירת מצב ההתחברות ושיפור חוויית המשתמש. באפשרותך לנהל את העוגיות דרך הגדרות הדפדפן.
        </Text>

        <Text style={styles.sectionTitle}>7. שינויים במדיניות</Text>
        <Text style={styles.paragraph}>
          אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באפליקציה. המשך השימוש לאחר עדכון מהווה הסכמה למדיניות המעודכנת.
        </Text>

        <Text style={styles.sectionTitle}>8. יצירת קשר</Text>
        <Text style={styles.paragraph}>
          לשאלות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו דרך כפתור &quot;דווח על בעיה&quot; באפליקציה.
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

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';
import {
  getFirestore, collection, getDocs, query, orderBy,
} from '../../src/services/firestore/imports';

interface Stats {
  totalRequests: number;
  totalBids: number;
  successfulMatches: number;
  avgRating: number | null;
  totalReviews: number;
  waitlistCount: number;
}

interface ActivityItem {
  action: string;
  screen: string;
  userId: string;
  createdAt: Date;
}

interface FeedbackItem {
  id: string;
  freeText: string;
  severity: string;
  screen: string;
  createdAt: Date;
}

const ACTION_LABELS: Record<string, string> = {
  capture_started: '\u{1F4F7} \u05D4\u05EA\u05D7\u05D9\u05DC \u05E6\u05D9\u05DC\u05D5\u05DD',
  photo_added: '\u{1F5BC} \u05D4\u05D5\u05E1\u05D9\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D4',
  video_recorded: '\u{1F3A5} \u05E6\u05D9\u05DC\u05DD \u05E1\u05E8\u05D8\u05D5\u05DF',
  capture_submitted: '\u{1F4E4} \u05E9\u05DC\u05D7 \u05DC\u05E0\u05D9\u05EA\u05D5\u05D7',
  ai_analysis_completed: '\u{1F916} \u05E0\u05D9\u05EA\u05D5\u05D7 AI \u05D4\u05D5\u05E9\u05DC\u05DD',
  request_confirmed: '\u2705 \u05D0\u05D9\u05E9\u05E8 \u05D5\u05E9\u05DC\u05D7 \u05DC\u05D1\u05E2\u05DC\u05D9 \u05DE\u05E7\u05E6\u05D5\u05E2',
  bid_viewed: '\u{1F441} \u05E6\u05E4\u05D4 \u05D1\u05D4\u05E6\u05E2\u05D5\u05EA',
  bid_selected: '\u{1F91D} \u05D1\u05D7\u05E8 \u05D1\u05E2\u05DC \u05DE\u05E7\u05E6\u05D5\u05E2',
  chat_opened: '\u{1F4AC} \u05E4\u05EA\u05D7 \u05E6\u05F3\u05D0\u05D8',
  chat_message_sent: '\u{1F4AC} \u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4',
  review_submitted: '\u2B50 \u05E9\u05DC\u05D7 \u05D3\u05D9\u05E8\u05D5\u05D2',
  review_skipped: '\u23ED \u05D3\u05D9\u05DC\u05D2 \u05E2\u05DC \u05D3\u05D9\u05E8\u05D5\u05D2',
  geo_blocked: '\u{1F6AB} \u05D7\u05E1\u05D5\u05DD \u05D2\u05D0\u05D5\u05D2\u05E8\u05E4\u05D9\u05EA',
  waitlist_signup: '\u{1F4E7} \u05E0\u05E8\u05E9\u05DD \u05DC\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4',
};

export default function AdminScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    const db = getFirestore();

    try {
      const [requestsSnap, bidsSnap, reviewsSnap, waitlistSnap] = await Promise.all([
        getDocs(collection(db, 'serviceRequests')).catch(() => null),
        getDocs(collection(db, 'bids')).catch(() => null),
        getDocs(collection(db, 'reviews')).catch(() => null),
        getDocs(collection(db, 'waitlist')).catch(() => null),
      ]);

      const requests = requestsSnap?.docs || [];
      const bids = bidsSnap?.docs || [];
      const reviews = reviewsSnap?.docs || [];

      const successfulMatches = requests.filter((d: any) => {
        const status = d.data()?.status;
        return status === 'in_progress' || status === 'closed';
      }).length;

      let avgRating: number | null = null;
      if (reviews.length > 0) {
        const totalRating = reviews.reduce(
          (sum: number, d: any) => sum + (d.data()?.rating || 0), 0
        );
        avgRating = Math.round((totalRating / reviews.length) * 10) / 10;
      }

      setStats({
        totalRequests: requests.length,
        totalBids: bids.length,
        successfulMatches,
        avgRating,
        totalReviews: reviews.length,
        waitlistCount: waitlistSnap?.docs?.length || 0,
      });

      await loadActivity(db);
      await loadFeedback(db);
    } catch (err) {
      console.error('Admin dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivity = async (db: any) => {
    try {
      const logsSnap = await getDocs(
        query(collection(db, 'session_logs'), orderBy('createdAt', 'desc'))
      );
      const logs = (logsSnap?.docs || []).slice(0, 30).map((d: any) => ({
        action: d.data().action || '',
        screen: d.data().screen || '',
        userId: d.data().userId || '',
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }));
      setActivity(logs);
    } catch {
      // session_logs might not have an index yet
    }
  };

  const loadFeedback = async (db: any) => {
    try {
      const fbSnap = await getDocs(
        query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
      );
      const fb = (fbSnap?.docs || []).slice(0, 20).map((d: any) => ({
        id: d.id,
        freeText: d.data().freeText || '',
        severity: d.data().severity || 'bug',
        screen: d.data().screen || '',
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }));
      setFeedback(fb);
    } catch {
      // feedback might not have an index yet
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{'\u05D8\u05D5\u05E2\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD...'}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Header onRefresh={loadDashboard} />
        {stats && <StatsGrid stats={stats} />}
        {stats && stats.waitlistCount > 0 && <WaitlistSection count={stats.waitlistCount} />}
        {feedback.length > 0 && <FeedbackSection feedback={feedback} />}
        <ActivitySection activity={activity} />
      </ScrollView>
    </ScreenContainer>
  );
}

function Header({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
      </Pressable>
      <Text style={styles.title}>{'\u{1F4CA} \u05DC\u05D5\u05D7 \u05D1\u05E7\u05E8\u05D4'}</Text>
      <Pressable onPress={onRefresh} hitSlop={10}>
        <Ionicons name="refresh" size={22} color={COLORS.primary} />
      </Pressable>
    </View>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: any; icon: string; color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsGrid({ stats }: { stats: Stats }) {
  const ratingDisplay = stats.avgRating !== null ? `\u2B50 ${stats.avgRating}` : '\u2014';
  return (
    <View style={styles.statsGrid}>
      <StatCard label={'\u05D1\u05E7\u05E9\u05D5\u05EA'} value={stats.totalRequests} icon="document-text" color={COLORS.primary} />
      <StatCard label={'\u05D4\u05E6\u05E2\u05D5\u05EA'} value={stats.totalBids} icon="pricetag" color={COLORS.success} />
      <StatCard label={'\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA'} value={stats.successfulMatches} icon="checkmark-circle" color={COLORS.warning} />
      <StatCard label={'\u05D3\u05D9\u05E8\u05D5\u05D2 \u05DE\u05DE\u05D5\u05E6\u05E2'} value={ratingDisplay} icon="star" color="#F59E0B" />
    </View>
  );
}

function WaitlistSection({ count }: { count: number }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{'\u{1F4E7} \u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4'}</Text>
      <Text style={styles.waitlistCount}>{`${count} \u05E0\u05E8\u05E9\u05DE\u05D9\u05DD \u05DE\u05D7\u05D5\u05E5 \u05DC\u05D0\u05D6\u05D5\u05E8`}</Text>
    </View>
  );
}

function FeedbackSection({ feedback }: { feedback: FeedbackItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{`\u{1F41B} \u05D3\u05D9\u05D5\u05D5\u05D7\u05D9\u05DD (${feedback.length})`}</Text>
      {feedback.slice(0, 10).map((fb) => (
        <View key={fb.id} style={styles.feedbackRow}>
          <View style={[styles.severityDot, {
            backgroundColor: fb.severity === 'critical' ? COLORS.error
              : fb.severity === 'bug' ? COLORS.warning
              : COLORS.primary,
          }]} />
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackText} numberOfLines={2}>{fb.freeText}</Text>
            <Text style={styles.feedbackMeta}>{fb.screen} \u2022 {timeAgo(fb.createdAt)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ActivitySection({ activity }: { activity: ActivityItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {`\u{1F4CB} \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D4 (${activity.length})`}
      </Text>
      {activity.length === 0 ? (
        <Text style={styles.emptyText}>{'\u05D0\u05D9\u05DF \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF'}</Text>
      ) : (
        activity.map((item, i) => (
          <View key={i} style={styles.activityRow}>
            <Text style={styles.activityAction}>
              {ACTION_LABELS[item.action] || item.action}
            </Text>
            <Text style={styles.activityMeta}>
              {item.userId.slice(0, 8)} \u2022 {timeAgo(item.createdAt)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '\u05E2\u05DB\u05E9\u05D9\u05D5';
  if (minutes < 60) return `\u05DC\u05E4\u05E0\u05D9 ${minutes} \u05D3\u05E7\u05F3`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `\u05DC\u05E4\u05E0\u05D9 ${hours} \u05E9\u05E2\u05F3`;
  const days = Math.floor(hours / 24);
  return `\u05DC\u05E4\u05E0\u05D9 ${days} \u05D9\u05DE\u05D9\u05DD`;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%' as any,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  waitlistCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackMeta: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  activityRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  activityAction: {
    color: COLORS.text,
    fontSize: 13,
  },
  activityMeta: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

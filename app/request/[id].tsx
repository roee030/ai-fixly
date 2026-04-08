import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, Pressable, ActivityIndicator,
  StyleSheet, Alert, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { requestService } from '../../src/services/requests';
import { bidService } from '../../src/services/bids';
import { analyticsService } from '../../src/services/analytics';
import { logger } from '../../src/services/logger';
import { REQUEST_STATUS, REQUEST_STATUS_LABELS } from '../../src/constants/status';
import { SERVICE_CATEGORIES } from '../../src/constants/categories';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';
import type { Bid } from '../../src/services/bids';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoadingBids, setIsLoadingBids] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const req = await requestService.getRequest(id);
      setRequest(req);
      if (req) {
        setIsLoadingBids(true);
        const bidList = await bidService.getBidsForRequest(id);
        setBids(bidList);
        if (bidList.length === 0 && req.status === 'open') {
          await bidService.createMockBids(id);
          const newBids = await bidService.getBidsForRequest(id);
          setBids(newBids);
        }
        setIsLoadingBids(false);
      }
    } catch (err) {
      logger.error('Load request failed', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails(!showDetails);
  };

  const handleSelectBid = (bid: Bid) => {
    Alert.alert(
      'בחירת בעל מקצוע',
      `לבחור את ${bid.providerName}?\n${bid.price} ש"ח - ${bid.availability}`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אשר בחירה',
          onPress: async () => {
            await bidService.selectBid(id, bid.id);
            analyticsService.trackEvent('bid_selected', { requestId: id, price: bid.price });
            loadData();
          },
        },
      ]
    );
  };

  const handleCancelSelection = async () => {
    if (!request) return;
    Alert.alert('ביטול בחירה', 'לבטל את בעל המקצוע שנבחר ולחזור להצעות?', [
      { text: 'לא', style: 'cancel' },
      {
        text: 'כן, בטל',
        style: 'destructive',
        onPress: async () => {
          await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
          loadData();
        },
      },
    ]);
  };

  const handlePause = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.PAUSED);
    analyticsService.trackEvent('request_paused', { requestId: request.id });
    loadData();
  };

  const handleResume = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
    loadData();
  };

  const handleClose = async () => {
    if (!request) return;
    Alert.alert('סגירת בקשה', 'לסגור את הבקשה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'סגור',
        onPress: async () => {
          await requestService.updateStatus(request.id, REQUEST_STATUS.CLOSED);
          analyticsService.trackEvent('request_closed', { requestId: request.id });
          loadData();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!request) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.error }}>בקשה לא נמצאה</Text>
        </View>
      </ScreenContainer>
    );
  }

  const categories = request.aiAnalysis.categories || [(request.aiAnalysis as any).category || 'general'];
  const statusLabel = REQUEST_STATUS_LABELS[request.status];
  const selectedBid = bids.find((b) => b.id === (request as any).selectedBidId);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {categories.map((c: string) => SERVICE_CATEGORIES.find((sc) => sc.id === c)?.labelHe || c).join(' / ')}
            </Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: request.status === 'open' ? COLORS.success + '20' :
                            request.status === 'in_progress' ? COLORS.warning + '20' :
                            request.status === 'paused' ? COLORS.info + '20' :
                            COLORS.textTertiary + '20'
          }]}>
            <Text style={[styles.statusText, {
              color: request.status === 'open' ? COLORS.success :
                     request.status === 'in_progress' ? COLORS.warning :
                     request.status === 'paused' ? COLORS.info :
                     COLORS.textTertiary
            }]}>
              {statusLabel?.he || request.status}
            </Text>
          </View>
        </View>

        {/* Collapsible request details */}
        <Pressable onPress={toggleDetails} style={styles.detailsToggle}>
          <Text style={styles.detailsToggleText}>פרטי הבקשה</Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>

        {showDetails && (
          <View style={styles.detailsContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {request.media.map((m, i) => (
                <Image key={i} source={{ uri: m.downloadUrl }} style={styles.mediaThumb} />
              ))}
            </ScrollView>
            <Text style={styles.summaryText}>{request.aiAnalysis.summary}</Text>
            {request.textDescription && (
              <Text style={styles.descText}>"{request.textDescription}"</Text>
            )}
          </View>
        )}

        {/* Selected provider card */}
        {selectedBid && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.selectedTitle}>בעל מקצוע נבחר</Text>
            </View>
            <Text style={styles.selectedName}>{selectedBid.providerName}</Text>
            <View style={styles.selectedDetails}>
              <View style={styles.detailChip}>
                <Ionicons name="pricetag" size={14} color={COLORS.primary} />
                <Text style={styles.detailChipText}>{selectedBid.price} ש"ח</Text>
              </View>
              <View style={styles.detailChip}>
                <Ionicons name="time" size={14} color={COLORS.success} />
                <Text style={styles.detailChipText}>{selectedBid.availability}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                style={[styles.actionChip, { backgroundColor: COLORS.primary }]}
                onPress={() => Alert.alert('צ\'אט', 'צ\'אט עם בעל מקצוע - בקרוב!')}
              >
                <Ionicons name="chatbubble" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>שלח הודעה</Text>
              </Pressable>
              <Pressable
                style={[styles.actionChip, { backgroundColor: COLORS.error + '20' }]}
                onPress={handleCancelSelection}
              >
                <Text style={{ color: COLORS.error, fontWeight: '600', fontSize: 13 }}>בטל בחירה</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Bids list */}
        {!selectedBid && (
          <>
            <View style={styles.bidsHeader}>
              <Text style={styles.bidsTitle}>
                {bids.length > 0 ? 'הצעות מחיר' : 'ממתין להצעות...'}
              </Text>
              {bids.length > 0 && (
                <View style={styles.bidCount}>
                  <Text style={styles.bidCountText}>{bids.length}</Text>
                </View>
              )}
            </View>

            {isLoadingBids ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : bids.length === 0 ? (
              <View style={styles.emptyBids}>
                <Ionicons name="hourglass-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.emptyBidsText}>בעלי מקצוע מקבלים את הבקשה שלך...</Text>
              </View>
            ) : (
              bids.map((bid) => (
                <Pressable key={bid.id} onPress={() => handleSelectBid(bid)} style={styles.bidCard}>
                  <View style={styles.bidTop}>
                    <Text style={styles.bidName}>{bid.providerName}</Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.ratingText}>{bid.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.bidInfo}>
                    <View style={styles.bidInfoItem}>
                      <Text style={styles.bidPrice}>{bid.price}</Text>
                      <Text style={styles.bidPriceLabel}>ש"ח</Text>
                    </View>
                    <View style={styles.bidDivider} />
                    <View style={styles.bidInfoItem}>
                      <Ionicons name="time-outline" size={16} color={COLORS.success} />
                      <Text style={styles.bidAvail}>{bid.availability}</Text>
                    </View>
                  </View>
                  <Text style={styles.bidSelectHint}>לחץ לבחירה</Text>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom actions */}
      {request.status !== REQUEST_STATUS.CLOSED && !selectedBid && (
        <View style={styles.bottomBar}>
          {request.status === REQUEST_STATUS.OPEN && (
            <Button title="השהה בקשה" onPress={handlePause} variant="secondary" />
          )}
          {request.status === REQUEST_STATUS.PAUSED && (
            <Button title="חדש הצעות" onPress={handleResume} />
          )}
          <Button title="סגור בקשה" onPress={handleClose} variant="ghost" />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  detailsToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  detailsToggleText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  detailsContent: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  mediaThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  summaryText: { color: COLORS.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  descText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
  selectedCard: {
    backgroundColor: COLORS.success + '10', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.success + '30',
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selectedTitle: { color: COLORS.success, fontSize: 14, fontWeight: '600' },
  selectedName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  selectedDetails: { flexDirection: 'row', gap: 12 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  detailChipText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  bidsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  bidsTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  bidCount: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  bidCountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyBids: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyBidsText: { color: COLORS.textSecondary, fontSize: 14 },
  bidCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  bidTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bidName: { color: COLORS.text, fontSize: 16, fontWeight: '600', flex: 1 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.warning + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  ratingText: { color: COLORS.warning, fontSize: 12, fontWeight: 'bold' },
  bidInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bidInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bidPrice: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold' },
  bidPriceLabel: { color: COLORS.primary, fontSize: 14 },
  bidDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  bidAvail: { color: COLORS.text, fontSize: 14 },
  bidSelectHint: { color: COLORS.primary, fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  bottomBar: { paddingVertical: 12, gap: 8 },
});

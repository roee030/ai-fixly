import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
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

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBids, setIsLoadingBids] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const req = await requestService.getRequest(id);
      setRequest(req);

      if (req) {
        setIsLoadingBids(true);
        const bidList = await bidService.getBidsForRequest(id);
        setBids(bidList);

        // If no bids yet, create mock ones (for testing)
        if (bidList.length === 0 && req.status === 'open') {
          logger.info('Creating mock bids for testing', { requestId: id });
          await bidService.createMockBids(id);
          const newBids = await bidService.getBidsForRequest(id);
          setBids(newBids);
        }
        setIsLoadingBids(false);
      }
    } catch (err) {
      logger.error('Load request failed', err as Error, { requestId: id });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBid = (bid: Bid) => {
    Alert.alert(
      'בחירת בעל מקצוע',
      `לבחור את ${bid.providerName} ב-${bid.price} ש"ח?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אשר',
          onPress: async () => {
            try {
              await bidService.selectBid(id, bid.id);
              analyticsService.trackEvent('bid_selected', {
                requestId: id,
                bidId: bid.id,
                price: bid.price,
              });
              loadData();
            } catch (err) {
              logger.error('Select bid failed', err as Error);
            }
          },
        },
      ]
    );
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
    await requestService.updateStatus(request.id, REQUEST_STATUS.CLOSED);
    analyticsService.trackEvent('request_closed', { requestId: request.id });
    loadData();
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

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.id === request.aiAnalysis.category)?.labelHe || request.aiAnalysis.category;
  const statusLabel = REQUEST_STATUS_LABELS[request.status];
  const selectedBid = bids.find((b) => b.id === (request as any).selectedBidId);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace('/(tabs)/requests')} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>פרטי בקשה</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: request.status === 'open' ? COLORS.success + '20' :
                            request.status === 'in_progress' ? COLORS.warning + '20' :
                            COLORS.primary + '20'
          }]}>
            <Text style={[styles.statusText, {
              color: request.status === 'open' ? COLORS.success :
                     request.status === 'in_progress' ? COLORS.warning :
                     COLORS.primary
            }]}>
              {statusLabel?.he || request.status}
            </Text>
          </View>
        </View>

        {/* Images */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {request.media.map((m, i) => (
            <Image key={i} source={{ uri: m.downloadUrl }} style={styles.mediaThumb} />
          ))}
        </ScrollView>

        {/* AI Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.categoryBadge}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 13 }}>{categoryLabel}</Text>
          </View>
          <Text style={styles.summaryText}>{request.aiAnalysis.summary}</Text>
        </View>

        {/* Selected provider */}
        {selectedBid && (
          <View style={styles.selectedCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedName}>{selectedBid.providerName}</Text>
              <Text style={styles.selectedPrice}>{selectedBid.price} ש"ח - {selectedBid.availability}</Text>
            </View>
          </View>
        )}

        {/* Bids section */}
        {!selectedBid && (
          <>
            <Text style={styles.sectionTitle}>
              {bids.length > 0 ? `הצעות מחיר (${bids.length})` : 'ממתין להצעות...'}
            </Text>

            {isLoadingBids ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              bids.map((bid) => (
                <Pressable key={bid.id} onPress={() => handleSelectBid(bid)} style={styles.bidCard}>
                  <View style={styles.bidHeader}>
                    <Text style={styles.bidName}>{bid.providerName}</Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={COLORS.warning} />
                      <Text style={styles.ratingText}>{bid.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.bidDetails}>
                    <View style={styles.bidDetail}>
                      <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.bidDetailText}>{bid.price} ש"ח</Text>
                    </View>
                    <View style={styles.bidDetail}>
                      <Ionicons name="time-outline" size={16} color={COLORS.success} />
                      <Text style={styles.bidDetailText}>{bid.availability}</Text>
                    </View>
                  </View>
                  <Text style={styles.bidCta}>לחץ לבחירה</Text>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {request.status === REQUEST_STATUS.OPEN && (
          <Button title="השהה בקשה" onPress={handlePause} variant="secondary" />
        )}
        {request.status === REQUEST_STATUS.PAUSED && (
          <Button title="חדש בקשה" onPress={handleResume} />
        )}
        {request.status !== REQUEST_STATUS.CLOSED && (
          <Button title="סגור בקשה" onPress={handleClose} variant="ghost" />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  selectedCard: {
    backgroundColor: COLORS.success + '15',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  selectedName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedPrice: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  bidCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bidDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  bidDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidDetailText: {
    color: COLORS.text,
    fontSize: 14,
  },
  bidCta: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomBar: {
    paddingVertical: 12,
    gap: 8,
  },
});

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, SkeletonImage } from '../../src/components/ui';
import { requestService } from '../../src/services/requests';
import { bidService } from '../../src/services/bids';
import { chatService } from '../../src/services/chat';
import { notifyProviderSelected } from '../../src/services/broadcast';
import { analyticsService } from '../../src/services/analytics';
import { logAction } from '../../src/services/analytics/sessionLogger';
import { logger } from '../../src/services/logger';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { formatAvailability, isAvailabilityExpired } from '../../src/utils/formatAvailability';
import { confirmDialog } from '../../src/utils/confirm';
import { localizeProfession } from '../../src/utils/professionLabel';
import { REQUEST_STATUS } from '../../src/constants/status';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';
import type { Bid } from '../../src/services/bids';

export default function RequestDetailsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Subscribe to real-time updates of the request document (broadcastedProviders, status, etc.)
  useEffect(() => {
    if (!id) return;
    const unsubscribe = requestService.onRequestChanged(id, (req) => {
      setRequest(req);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [id]);

  // Subscribe to bid updates in real time so new bids appear instantly
  useEffect(() => {
    if (!id) return;
    setIsLoadingBids(true);
    const unsubscribe = bidService.onBidsChanged(id, (newBids) => {
      setBids(newBids);
      setIsLoadingBids(false);
      if (newBids.length > 0) {
        logAction('bid_viewed', 'request_details', { bidCount: newBids.length });
      }
      // Mark this request "read" — any bids now visible are considered seen.
      useRequestsStore.getState().markRead(id);
    });
    return unsubscribe;
  }, [id]);

  // No manual reload needed — onSnapshot listeners handle all updates in real time.

  const handleSelectBid = async (bid: Bid) => {
    const when = formatAvailability(bid, new Date(), t);
    const confirmed = await confirmDialog(
      t('requestDetails.selectProvider'),
      t('requestDetails.selectProviderConfirm', { name: bid.providerName, price: bid.price, when }),
      t('requestDetails.confirmSelection'),
      t('common.cancel'),
    );
    if (!confirmed) return;
    try {
      // Clear any previous chat (from a prior selection of a different
      // provider) so the new provider starts with a clean slate.
      await chatService.clearMessages(id).catch(() => {});

      // 1. Update Firestore (status + denormalized selected provider fields)
      await bidService.selectBid(id, bid);
      analyticsService.trackEvent('bid_selected', { requestId: id, price: bid.price });
      logAction('bid_selected', 'request_details', { price: bid.price });

      // 2. Notify the worker to send 'you were selected' WhatsApp to the
      //    provider and refresh the phone->requestId mapping.
      notifyProviderSelected({
        requestId: id,
        providerPhone: bid.providerPhone,
        providerName: bid.providerName,
      }).catch((err: unknown) => logger.error('notifyProviderSelected failed', err as Error));
    } catch (err) {
      logger.error('selectBid failed', err as Error);
    }
  };

  const handleCancelSelection = async () => {
    if (!request) return;
    const confirmed = await confirmDialog(
      t('requestDetails.cancelSelection'),
      t('requestDetails.cancelSelectionConfirm'),
      t('common.yes'),
      t('common.no'),
    );
    if (!confirmed) return;
    try {
      // Clear the chat history so the next provider starts clean
      await chatService.clearMessages(request.id);
    } catch (err) {
      logger.error('clearMessages on cancel failed', err as Error);
    }
    await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
  };

  const handlePause = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.PAUSED);
    analyticsService.trackEvent('request_paused', { requestId: request.id });
  };

  const handleResume = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
  };

  const handleClose = async () => {
    if (!request) return;
    // If a provider was selected, the customer can rate them — go to review.
    // If no one was selected, skip review entirely (nobody to rate) and go
    // back to the requests list.
    const hasSelection = !!(request as any).selectedBidId;
    const confirmed = await confirmDialog(
      t('requestDetails.closeRequest'),
      hasSelection ? t('requestDetails.closeConfirm') : t('requestDetails.closeConfirmNoBid'),
      hasSelection ? t('requestDetails.closeAndRate') : t('requestDetails.closeRequest'),
      t('common.cancel'),
    );
    if (!confirmed) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.CLOSED);
    analyticsService.trackEvent('request_closed', { requestId: request.id });
    if (hasSelection) {
      router.push({ pathname: '/review/[requestId]', params: { requestId: request.id } });
    } else {
      router.replace('/(tabs)/requests');
    }
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
          <Text style={{ color: COLORS.error, fontSize: 16, marginBottom: 16 }}>{t('requestDetails.requestNotFound')}</Text>
          <Pressable onPress={() => setShowFeedback(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>{t('common.reportProblem')}</Text>
          </Pressable>
        </View>
        <FeedbackModal
          visible={showFeedback}
          onClose={() => setShowFeedback(false)}
          screen="request_details"
          errorMessage="Request not found"
        />
      </ScreenContainer>
    );
  }

  const ai = request.aiAnalysis as any;
  // Localize profession labels. Prefer stable keys (ai.professions) over
  // Hebrew labels (ai.professionLabelsHe) because keys translate cleanly
  // in all 4 UI languages.
  const professionSource: string[] = Array.isArray(ai?.professions)
    ? ai.professions
    : Array.isArray(ai?.professionLabelsHe)
    ? ai.professionLabelsHe
    : [];
  const professionLabels: string[] = professionSource.map((p) => localizeProfession(p, t));
  const shortSummary = ai?.shortSummary || ai?.summary || '';
  const selectedBid = bids.find((b) => b.id === (request as any).selectedBidId);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => {
            if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); }
          }} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('requestDetails.title')}</Text>
            {professionLabels.length > 0 && (
              <Text style={styles.headerSubtitle}>{professionLabels.join(' • ')}</Text>
            )}
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
              {t(`status.${request.status}`, { defaultValue: request.status })}
            </Text>
          </View>
        </View>

        {/* Collapsible request details - closed by default */}
        <Pressable onPress={() => setShowDetails(!showDetails)} style={styles.detailsToggle}>
          <Text style={styles.detailsToggleText}>{t('requestDetails.requestDetails')}</Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>

        {showDetails && (
          <View style={styles.detailsContent}>
            {request.media && request.media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {request.media.map((m, i) => (
                  <SkeletonImage
                    key={i}
                    source={{ uri: m.downloadUrl }}
                    width={80}
                    height={80}
                    borderRadius={8}
                    containerStyle={{ marginRight: 8 }}
                  />
                ))}
              </ScrollView>
            )}
            {request.textDescription && (
              <View style={styles.customerTextBlock}>
                <Text style={styles.blockLabel}>{t('confirm.whatYouWrote')}</Text>
                <Text style={styles.customerText}>{request.textDescription}</Text>
              </View>
            )}
            {shortSummary ? (
              <View style={styles.aiBlock}>
                <View style={styles.aiLabelRow}>
                  <Ionicons name="sparkles" size={12} color={COLORS.primary} />
                  <Text style={styles.aiLabel}>{t('confirm.aiAnalysis')}</Text>
                </View>
                <Text style={styles.summaryText}>{shortSummary}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Selected provider card — calm, no entrance animation */}
        {selectedBid && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <Text style={styles.selectedTitle}>{t('requestDetails.providerSelected')}</Text>
            </View>
            <Text style={styles.selectedName}>{selectedBid.providerName}</Text>
            <View style={styles.selectedDetails}>
              <View style={styles.detailChip}>
                <Ionicons name="pricetag" size={13} color={COLORS.primary} />
                <Text style={styles.detailChipText}>{selectedBid.price} {t('requestDetails.shekel')}</Text>
              </View>
              <View style={styles.detailChip}>
                <Ionicons name="time" size={13} color={COLORS.success} />
                <Text style={styles.detailChipText}>
                  {formatAvailability(selectedBid, new Date(), t)}
                </Text>
              </View>
            </View>

            {/* Phone reveal — only after the customer confirmed the selection */}
            {selectedBid.providerPhone && (
              <View style={styles.phoneReveal}>
                <Ionicons name="call" size={16} color={COLORS.primary} />
                <Text style={styles.phoneRevealText} selectable>
                  {selectedBid.providerPhone}
                </Text>
              </View>
            )}

            {/* Primary CTA — call directly. Chat between customer and
                provider was removed: contact happens by phone. */}
            <Pressable
              style={styles.chatCta}
              onPress={() => {
                const phone = selectedBid.providerPhone;
                if (phone) Linking.openURL(`tel:${phone}`);
              }}
            >
              <Ionicons name="call" size={22} color="#FFFFFF" />
              <Text style={styles.chatCtaText}>{t('requestDetails.callProvider', { name: selectedBid.providerName })}</Text>
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable style={styles.cancelSelectionBtn} onPress={handleCancelSelection}>
              <Text style={styles.cancelSelectionText}>{t('requestDetails.cancelSelection')}</Text>
            </Pressable>
          </View>
        )}

        {/* Quiet confirmation that we're searching — only while still OPEN. */}
        {!selectedBid && request.status === REQUEST_STATUS.OPEN && (request as any)?.broadcastedProviders?.length > 0 && bids.length === 0 && (
          <View style={styles.searchingRow}>
            <Ionicons name="radio-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.searchingText}>{t('requestDetails.searchingProviders')}</Text>
          </View>
        )}

        {/* Bids list */}
        {!selectedBid && request.status !== REQUEST_STATUS.CLOSED && (
          <>
            <View style={styles.bidsHeader}>
              <Text style={styles.bidsTitle}>
                {bids.length > 0 ? t('requestDetails.priceOffers') : t('requestDetails.waitingForOffers')}
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
                <Text style={styles.emptyBidsText}>{t('requestDetails.waitingForProviders')}</Text>
              </View>
            ) : (
              bids.map((bid) => {
                const expired = isAvailabilityExpired(bid, new Date());
                return (
                  <Pressable
                    key={bid.id}
                    onPress={() => { if (!expired) handleSelectBid(bid); }}
                    disabled={expired}
                    style={[styles.bidCard, expired && styles.bidCardDisabled]}
                  >
                    <View style={styles.bidTop}>
                      <Text style={styles.bidName} numberOfLines={1}>{bid.displayName || bid.providerName}</Text>
                      {bid.rating !== null && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color={COLORS.warning} />
                          <Text style={styles.ratingText}>{bid.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    {!bid.isReal && (
                      <View style={styles.demoBadge}>
                        <Ionicons name="flask-outline" size={10} color={COLORS.info} />
                        <Text style={styles.demoBadgeText}>{t('requestDetails.demoOffer')}</Text>
                      </View>
                    )}
                    <View style={styles.bidInfo}>
                      <View style={styles.bidInfoItem}>
                        <Text style={styles.bidPrice}>{bid.price}</Text>
                        <Text style={styles.bidPriceLabel}>{t('requestDetails.shekel')}</Text>
                      </View>
                      <View style={styles.bidDivider} />
                      <View style={styles.bidInfoItem}>
                        <Ionicons name="time-outline" size={16} color={expired ? COLORS.error : COLORS.success} />
                        <Text style={[styles.bidAvail, expired && { color: COLORS.error }]}>
                          {formatAvailability(bid, new Date(), t)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bidSelectHint, expired && { color: COLORS.error }]}>
                      {expired ? t('requestDetails.bidExpired') : t('requestDetails.tapToSelect')}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom actions — always show close while request isn't already CLOSED */}
      {request.status !== REQUEST_STATUS.CLOSED && (
        <View style={styles.bottomBar}>
          {!selectedBid && request.status === REQUEST_STATUS.OPEN && (
            <Button title={t('requestDetails.pauseRequest')} onPress={handlePause} variant="secondary" />
          )}
          {!selectedBid && request.status === REQUEST_STATUS.PAUSED && (
            <Button title={t('requestDetails.resumeOffers')} onPress={handleResume} />
          )}
          <Button title={t('requestDetails.closeRequest')} onPress={handleClose} variant="ghost" />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
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
  summaryText: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  descText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
  customerTextBlock: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  blockLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 4,
    fontWeight: '600',
  },
  customerText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  aiBlock: {
    backgroundColor: COLORS.primary + '0A',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  selectedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  selectedTitle: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
  selectedName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selectedDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailChipText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  phoneReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  phoneRevealText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  chatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  chatCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
  },
  callRowText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelSelectionBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cancelSelectionText: { color: COLORS.error, fontSize: 12, fontWeight: '500' },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchingText: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.info + '15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  demoBadgeText: {
    color: COLORS.info,
    fontSize: 10,
    fontWeight: '600',
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
  bidCardDisabled: {
    opacity: 0.55, borderColor: COLORS.error + '40',
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

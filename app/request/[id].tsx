import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Alert, Linking, Modal, Image, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, SkeletonImage } from '../../src/components/ui';
import { VideoPreview } from '../../src/components/ui/VideoPreview';
import { requestService } from '../../src/services/requests';
import { bidService } from '../../src/services/bids';
import { chatService } from '../../src/services/chat';
import { notifyProviderSelected, expandRequestRadius } from '../../src/services/broadcast';
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
  const [preview, setPreview] = useState<
    | { kind: 'image'; uri: string }
    | { kind: 'video'; uri: string; posterUri?: string }
    | null
  >(null);

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

  // "Cancel request" — fires when the customer wants to withdraw before
  // picking a provider. We used to have Pause/Resume here too; both were
  // removed in favour of the simpler "just cancel" model. Cancel writes
  // status=CLOSED so Firestore / broker treat it the same as a completed
  // request (no more bids accepted, cron skips it, etc).
  const handleCancel = async () => {
    if (!request) return;
    const confirmed = await confirmDialog(
      t('requestDetails.cancelTitle'),
      t('requestDetails.cancelBody'),
      t('requestDetails.cancelConfirm'),
      t('common.cancel'),
    );
    if (!confirmed) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.CLOSED);
    // Reuse the existing `request_closed` event — "cancel" is just a
    // close without a selection, which analytics tracks the same way.
    analyticsService.trackEvent('request_closed', { requestId: request.id });
    router.replace('/(tabs)/requests');
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Without flex:1 the ScrollView sizes to its content, which in a
        // column-flex parent lets the sibling bottomBar grow unbounded
        // and the ScrollView itself stops scrolling (content height ==
        // scroll area). flex:1 pins it to the remaining vertical space.
        style={{ flex: 1 }}
        // Tall enough to clear the bottomBar's cancel/close button —
        // anything less hides the last bid card.
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
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
                {request.media.map((m: any, i) => {
                  // Tolerate both UploadedMedia (downloadUrl) and the legacy
                  // MediaItem (url) shapes — old requests may still be in
                  // Firestore without the type/thumbnailUrl fields.
                  const url: string = m.downloadUrl || m.url;
                  const isVideo = m.type === 'video';
                  const posterUri: string | undefined = m.thumbnailUrl;
                  return (
                    <Pressable
                      key={i}
                      onPress={() =>
                        setPreview(
                          isVideo
                            ? { kind: 'video', uri: url, posterUri }
                            : { kind: 'image', uri: url },
                        )
                      }
                      style={{ marginRight: 8 }}
                    >
                      {isVideo ? (
                        <View style={styles.videoThumbWrap}>
                          {posterUri ? (
                            <SkeletonImage
                              source={{ uri: posterUri }}
                              width={80}
                              height={80}
                              borderRadius={8}
                            />
                          ) : (
                            <View style={[styles.mediaThumb, styles.videoThumbFallback]} />
                          )}
                          <View style={styles.videoPlayOverlay}>
                            <Ionicons name="play-circle" size={28} color="#FFFFFF" />
                          </View>
                        </View>
                      ) : (
                        <SkeletonImage
                          source={{ uri: url }}
                          width={80}
                          height={80}
                          borderRadius={8}
                        />
                      )}
                    </Pressable>
                  );
                })}
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

            {/* Phone reveal — only after the customer confirmed the selection.
                Phone stays hidden until the user explicitly taps "reveal"; an
                extra friction step so the number doesn't show up by accident
                (e.g. if the customer is sharing their screen). */}
            {selectedBid.providerPhone && (
              <PhoneRevealCard
                phone={selectedBid.providerPhone}
                tapToRevealLabel={t('requestDetails.tapToReveal')}
                callLabel={t('requestDetails.callNow')}
              />
            )}

            {/* Contact actions — the customer gets three ways to reach the
                selected provider. Call opens the dialer. WhatsApp opens the
                native app with a pre-filled, context-aware opener so the
                provider sees immediately who's calling and what it's about.
                SMS falls back to whichever messaging client the OS prefers. */}
            {selectedBid.providerPhone && (
              <View style={styles.contactRow}>
                <ContactActionButton
                  icon="call"
                  label={t('requestDetails.contactCall')}
                  color={COLORS.primary}
                  onPress={() => Linking.openURL(`tel:${selectedBid.providerPhone}`)}
                />
                <ContactActionButton
                  icon="logo-whatsapp"
                  label={t('requestDetails.contactWhatsapp')}
                  color="#25D366"
                  onPress={() => openWhatsappWith(
                    selectedBid.providerPhone!,
                    selectedBid.providerName,
                    shortSummary,
                    t,
                  )}
                />
                <ContactActionButton
                  icon="chatbubble"
                  label={t('requestDetails.contactSms')}
                  color={COLORS.success}
                  onPress={() => Linking.openURL(`sms:${selectedBid.providerPhone}`)}
                />
              </View>
            )}

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
                <StaleRequestBanner
                  request={request}
                  hasBids={bids.length > 0}
                  t={t}
                />
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
                    {bid.notes && (
                      <View style={styles.bidNotesBlock}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={12}
                          color={COLORS.textSecondary}
                          style={{ marginTop: 3 }}
                        />
                        <Text style={styles.bidNotesText} numberOfLines={4}>
                          {bid.notes}
                        </Text>
                      </View>
                    )}
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

      {/* Bottom actions.
          • Pre-selection → "Cancel request" (destructive, ends the request
            with no provider).
          • Post-selection, pre-close → "Close request" (ends + routes to
            review so the customer can rate).
          • After CLOSED → no actions.
          Pause / Resume were intentionally removed — they added a second
          status path without a real use case.                               */}
      {request.status !== REQUEST_STATUS.CLOSED && (
        <View style={styles.bottomBar}>
          {!selectedBid ? (
            <Button
              title={t('requestDetails.cancelRequest')}
              onPress={handleCancel}
              variant="ghost"
            />
          ) : (
            <Button
              title={t('requestDetails.closeRequest')}
              onPress={handleClose}
              variant="ghost"
            />
          )}
        </View>
      )}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewOverlay}>
          {preview?.kind === 'video' ? (
            <VideoPreview uri={preview.uri} posterUri={preview.posterUri} style={styles.previewVideo} />
          ) : preview ? (
            <Pressable style={styles.previewImageWrap} onPress={() => setPreview(null)}>
              <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
            </Pressable>
          ) : null}
          <Pressable style={styles.previewClose} onPress={() => setPreview(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/**
 * Two-step phone reveal. The phone stays covered behind a tappable card until
 * the customer explicitly asks to see it. First tap uncovers the number with
 * a fade + scale animation; a second tap (or the explicit "call now" button)
 * opens the phone dialer. This adds just enough friction that the number
 * can't leak via a screenshot / screen-share without an intentional reveal.
 */
function PhoneRevealCard({
  phone,
  tapToRevealLabel,
  callLabel,
}: {
  phone: string;
  tapToRevealLabel: string;
  callLabel: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const opacity = useSharedValue(0);
  const coverOpacity = useSharedValue(1);
  const scale = useSharedValue(0.92);

  const reveal = () => {
    if (revealed) {
      Linking.openURL(`tel:${phone}`);
      return;
    }
    setRevealed(true);
    coverOpacity.value = withTiming(0, { duration: 240 });
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
  };

  const coverStyle = useAnimatedStyle(() => ({ opacity: coverOpacity.value }));
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={reveal} style={styles.phoneRevealCard}>
      {!revealed && (
        <Animated.View style={[styles.phoneRevealCover, coverStyle]}>
          <Ionicons name="eye-off-outline" size={20} color={COLORS.primary} />
          <Text style={styles.phoneRevealCoverText}>{tapToRevealLabel}</Text>
        </Animated.View>
      )}
      {revealed && (
        <Animated.View style={[styles.phoneRevealContent, phoneStyle]}>
          <Ionicons name="call" size={16} color={COLORS.primary} />
          <Text style={styles.phoneRevealText} selectable>
            {phone}
          </Text>
          <Text style={styles.phoneRevealCta}>{callLabel}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * One of three square tiles in the post-selection contact row. Pure
 * presentation — the parent decides what each tap does (tel: / whatsapp /
 * sms). Kept local so we don't ship a generic "IconButton" abstraction we
 * don't need elsewhere.
 */
function ContactActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactBtn,
        { borderColor: color + '55', backgroundColor: color + '14' },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.contactBtnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Build the pre-filled WhatsApp opener and hand it to the OS. The
 * `whatsapp://send?phone=...&text=...` scheme is the cross-platform way
 * to jump straight into a chat with the message already typed — the
 * customer just hits send. We always strip the leading "+" from the phone
 * because the scheme expects E.164 digits only.
 */
function openWhatsappWith(
  rawPhone: string,
  providerName: string,
  summary: string,
  t: (k: string, o?: any) => string,
) {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  const trimmedSummary = (summary || '').trim();
  const text = trimmedSummary
    ? t('requestDetails.whatsappHello', { name: providerName, summary: trimmedSummary })
    : t('requestDetails.whatsappHelloFallback');
  const url = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`;
  Linking.openURL(url).catch(() => {
    // If WhatsApp isn't installed, fall back to the web handler which
    // offers "open in app / continue on web" and still prefills the text.
    Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`).catch(() => {});
  });
}

/**
 * Shown under "waiting for providers" when the request is older than one
 * hour and no bids have landed. Offers to re-broadcast with a larger
 * search radius. The banner hides itself after the user triggers it —
 * the worker writes `radiusExpandedAt` on the request doc and we respect
 * that here too (so the banner doesn't reappear on the next visit).
 */
function StaleRequestBanner({
  request,
  hasBids,
  t,
}: {
  request: any;
  hasBids: boolean;
  t: (k: string, o?: any) => string;
}) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (hasBids) return null;
  if (request.radiusExpandedAt || expanded) {
    return (
      <Text style={staleStyles.expandedHint}>
        {t('requestDetails.radiusAlreadyExpanded')}
      </Text>
    );
  }

  const createdAtMs = toDate(request.createdAt)?.getTime() ?? 0;
  const ageMinutes = (Date.now() - createdAtMs) / 60000;
  if (ageMinutes < 60) return null;

  const broadcastCount = request?.broadcastedProviders?.length || 0;

  const handleExpand = async () => {
    setIsExpanding(true);
    const ok = await expandRequestRadius(request.id);
    setIsExpanding(false);
    if (ok) setExpanded(true);
  };

  return (
    <View style={staleStyles.banner}>
      <Ionicons name="compass-outline" size={22} color={COLORS.primary} />
      <View style={{ flex: 1 }}>
        <Text style={staleStyles.title}>
          {t('requestDetails.staleTitle', { count: broadcastCount })}
        </Text>
        <Text style={staleStyles.body}>
          {t('requestDetails.staleBody')}
        </Text>
        <Pressable
          style={[staleStyles.button, isExpanding && { opacity: 0.5 }]}
          disabled={isExpanding}
          onPress={handleExpand}
        >
          <Text style={staleStyles.buttonText}>
            {isExpanding
              ? t('common.loading')
              : t('requestDetails.expandRadiusCta')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate();
    } catch {
      return null;
    }
  }
  if (typeof val === 'string') return new Date(val);
  return null;
}

const staleStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '40',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  expandedHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});

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
  videoThumbWrap: { position: 'relative', width: 80, height: 80 },
  videoThumbFallback: {
    backgroundColor: '#101015',
    width: 80,
    height: 80,
    marginRight: 0,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').width - 32,
    borderRadius: 12,
  },
  previewVideo: {
    width: Dimensions.get('window').width - 32,
    height: (Dimensions.get('window').width - 32) * 1.2,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  previewClose: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
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
  phoneRevealCard: {
    minHeight: 72,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginBottom: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneRevealCover: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  phoneRevealCoverText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  phoneRevealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  phoneRevealCta: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
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
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  contactBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
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
  bidNotesBlock: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bidNotesText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
  bidSelectHint: { color: COLORS.primary, fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  bottomBar: { paddingVertical: 12, gap: 8 },
});

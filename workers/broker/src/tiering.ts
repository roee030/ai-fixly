/**
 * 3-Wave provider tiering for smart broadcast.
 *
 * Instead of blasting all providers at once, we send in waves:
 *   Wave 1 (t=0):     Top 3 by rating — best providers get first dibs
 *   Wave 2 (t+15min): Next 3 — if <2 bids received
 *   Wave 3 (t+30min): All remaining — last resort
 *
 * This incentivizes providers to maintain high ratings (they get jobs first)
 * and reduces WhatsApp spam for everyone.
 */

export const WAVE_CONFIG = {
  WAVE_SIZE: 3,
  MIN_BIDS_TO_STOP: 2,
  WAVE_2_DELAY_MINUTES: 15,
  WAVE_3_DELAY_MINUTES: 30,
} as const;

/**
 * Get the providers that should be contacted in a given wave.
 *
 * Assumes `sortedProviders` is already sorted by rating descending.
 * Wave 1: indices 0-2, Wave 2: indices 3-5, Wave 3: index 6+
 */
export function getProvidersForWave<T>(sortedProviders: T[], wave: 1 | 2 | 3): T[] {
  const start = (wave - 1) * WAVE_CONFIG.WAVE_SIZE;

  if (wave === 3) {
    return sortedProviders.slice(start);
  }

  return sortedProviders.slice(start, start + WAVE_CONFIG.WAVE_SIZE);
}

/**
 * Should we send the next wave? Only if we haven't received enough bids yet.
 */
export function shouldSendNextWave(currentBidCount: number): boolean {
  return currentBidCount < WAVE_CONFIG.MIN_BIDS_TO_STOP;
}

/**
 * Calculate the ISO timestamp for when the next wave should fire.
 * Returns null if this is the last wave (wave 3) or enough bids received.
 */
export function getNextWaveTime(
  currentWave: 1 | 2 | 3,
  now: Date = new Date()
): string | null {
  if (currentWave >= 3) return null;

  const delayMinutes =
    currentWave === 1
      ? WAVE_CONFIG.WAVE_2_DELAY_MINUTES
      : WAVE_CONFIG.WAVE_3_DELAY_MINUTES;

  const nextTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
  return nextTime.toISOString();
}

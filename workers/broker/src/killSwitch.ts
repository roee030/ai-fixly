/**
 * Remote kill switches.
 *
 * Tiny KV-backed toggle store that any Worker handler can check before
 * doing something expensive / irreversible. The admin UI flips them via a
 * token-protected endpoint (see handleAdminKillSwitch in index.ts).
 *
 * Available switches:
 *   whatsapp   — when true, broadcasts skip every Twilio call. The /broadcast
 *                request still succeeds (the customer sees "we're looking")
 *                so we can debug without angering users, but no SMS/WhatsApp
 *                goes out. Use in emergencies (Twilio on fire, billing
 *                overrun, compliance issue).
 *   aiAnalysis — when true, /ai-pipeline calls short-circuit. Unused today
 *                since analysis runs on the client, but reserved.
 *
 * Design notes:
 * - KV reads are cached at the edge; a flip may take up to 60s to take
 *   effect globally. Good enough for a "panic button".
 * - We default to OFF (false) if the KV key is missing — missing config
 *   should never gate a live service.
 */

export type KillSwitchName = 'whatsapp' | 'aiAnalysis';

function keyFor(name: KillSwitchName): string {
  return `killSwitch:${name}`;
}

export async function isKillSwitchOn(
  kv: KVNamespace,
  name: KillSwitchName,
): Promise<boolean> {
  try {
    const v = await kv.get(keyFor(name));
    return v === 'on' || v === 'true' || v === '1';
  } catch (err) {
    console.warn('[kill-switch] read failed:', err);
    return false;
  }
}

export async function setKillSwitch(
  kv: KVNamespace,
  name: KillSwitchName,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await kv.put(keyFor(name), 'on');
  } else {
    await kv.delete(keyFor(name));
  }
}

export async function listKillSwitches(
  kv: KVNamespace,
): Promise<Record<KillSwitchName, boolean>> {
  const names: KillSwitchName[] = ['whatsapp', 'aiAnalysis'];
  const entries = await Promise.all(
    names.map(async (n) => [n, await isKillSwitchOn(kv, n)] as const),
  );
  return Object.fromEntries(entries) as Record<KillSwitchName, boolean>;
}

import { Platform } from 'react-native';

/**
 * Render an array of rows to RFC-4180 CSV. Fields containing commas,
 * quotes, or newlines are quoted; embedded quotes are doubled.
 *
 * We prefix the output with a UTF-8 BOM so Excel (the most common target
 * for admin exports) auto-detects encoding and renders Hebrew correctly
 * without extra configuration.
 */

export function toCsv<T>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string }>,
): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const bodyLines = rows.map((r) =>
    columns.map((c) => {
      const raw = r[c.key];
      if (raw === null || raw === undefined) return '';
      if (raw instanceof Date) return escapeCell(raw.toISOString());
      return escapeCell(String(raw));
    }).join(','),
  );
  return [headerLine, ...bodyLines].join('\n');
}

function escapeCell(value: string): string {
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/**
 * Platform-specific download/share. On web a Blob + anchor click triggers
 * a native download; on mobile we write to cache and hand off to
 * expo-sharing so the user can pick "Save to Files" / "Send via ...".
 */
export async function downloadCsv(filename: string, csvBody: string): Promise<void> {
  const withBom = '\uFEFF' + csvBody;

  if (Platform.OS === 'web') {
    const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Mobile: write to cache, open the native share sheet. Deferred requires
  // so bundlers that tree-shake the web build don't pull expo-file-system.
  const FileSystem = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, withBom, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: filename });
  }
}

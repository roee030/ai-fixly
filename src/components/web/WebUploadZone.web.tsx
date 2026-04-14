import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';

interface WebUploadZoneProps {
  onPhotosSelected: (uris: string[]) => void;
  maxPhotos?: number;
}

export function WebUploadZone({ onPhotosSelected, maxPhotos = 5 }: WebUploadZoneProps) {
  const { t } = useTranslation();
  const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, maxPhotos - previews.length);

    const newPreviews = newFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));

    const updated = [...previews, ...newPreviews].slice(0, maxPhotos);
    setPreviews(updated);
    onPhotosSelected(updated.map(p => p.url));
  }, [previews, maxPhotos, onPhotosSelected]);

  const removePhoto = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index].url);
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onPhotosSelected(updated.map(p => p.url));
  }, [previews, onPhotosSelected]);

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) addFiles(imageFiles);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => inputRef.current?.click()}
        style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
        // @ts-ignore — web DOM events
        onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e: any) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
        }}
      >
        <View style={[styles.iconCircle, isDragOver && styles.iconCircleActive]}>
          <Ionicons
            name={isDragOver ? 'arrow-down' : 'cloud-upload-outline'}
            size={36}
            color={isDragOver ? COLORS.primary : COLORS.textTertiary}
          />
        </View>
        <Text style={styles.dropTitle}>
          {isDragOver ? t('upload.dropZoneActive') : t('upload.dropZoneDefault')}
        </Text>
        <Text style={styles.dropHint}>
          {t('upload.dropZoneHint')}
        </Text>
        <Text style={styles.dropLimit}>{t('upload.dropZoneLimit', { max: maxPhotos })}</Text>
      </Pressable>

      {/* Hidden file input */}
      <input
        ref={inputRef as any}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e: any) => {
          if (e.target.files) {
            addFiles(e.target.files);
            e.target.value = ''; // Reset so same file can be re-selected
          }
        }}
      />

      {/* Thumbnails */}
      {previews.length > 0 && (
        <View style={styles.thumbRow}>
          {previews.map((p, i) => (
            <View key={p.url} style={styles.thumbWrapper}>
              <Image source={{ uri: p.url }} style={styles.thumb} />
              <Pressable style={styles.thumbRemove} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={22} color={COLORS.error} />
              </Pressable>
            </View>
          ))}
          {previews.length < maxPhotos && (
            <Pressable style={styles.addMore} onPress={() => inputRef.current?.click()}>
              <Ionicons name="add" size={28} color={COLORS.textTertiary} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  dropZone: {
    borderWidth: 2,
    borderColor: COLORS.border,
    // @ts-ignore — web-only dashed border
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    // @ts-ignore — web cursor
    cursor: 'pointer',
  } as any,
  dropZoneActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleActive: {
    backgroundColor: COLORS.primary + '20',
  },
  dropTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600' as any,
    textAlign: 'center' as any,
  },
  dropHint: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center' as any,
  },
  dropLimit: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: 'center' as any,
    marginTop: 4,
  },
  thumbRow: {
    flexDirection: 'row' as any,
    flexWrap: 'wrap' as any,
    gap: 10,
  },
  thumbWrapper: {
    position: 'relative' as any,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbRemove: {
    position: 'absolute' as any,
    top: -8,
    right: -8,
    backgroundColor: COLORS.background,
    borderRadius: 11,
  },
  addMore: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    // @ts-ignore — web-only dashed border
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  } as any,
});

import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { useTranslation } from 'react-i18next';

import { Sentry } from '../../lib/sentry';
import { useTheme } from '../../hooks/useTheme';
import { useScanJobs } from '../../hooks/useScanJobs';

type InputMode = 'camera' | 'search';
type CameraFacing = 'back' | 'front';

export default function ScanScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('scan');
  const { startScan } = useScanJobs();
  const [permission, requestPermission] = useCameraPermissions();
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [query, setQuery] = useState('');
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webInputRef = useRef<any>(null);

  // Web: file input onChange — receives a File object directly from the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleWebFileChange(e: any) {
    const file: File | undefined = e?.target?.files?.[0];
    if (!file) return;
    if (webInputRef.current) webInputRef.current.value = '';

    // On web, pass the File object URL. The ScanJobContext handles FormData.
    let uri: string;
    try {
      uri = URL.createObjectURL(file);
    } catch {
      uri = file.name;
    }
    startScan('image', uri);
  }

  // Native: camera shutter — take photo, persist to document dir, start background scan.
  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'Camera capture started',
      level: 'info',
    });
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (!photo?.uri) {
        Sentry.addBreadcrumb({
          category: 'scan',
          message: 'takePictureAsync returned no URI',
          level: 'warning',
        });
        return;
      }

      // Copy temp file to persistent document directory.
      const destDir = new Directory(Paths.document, 'scan-queue');
      if (!destDir.exists) {
        destDir.create();
      }
      const destFile = new File(destDir, `${Date.now()}.jpg`);
      const sourceFile = new File(photo.uri);
      sourceFile.copy(destFile);

      Sentry.addBreadcrumb({
        category: 'scan',
        message: 'Photo saved, starting scan',
        level: 'info',
        data: { destUri: destFile.uri },
      });
      startScan('image', destFile.uri);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'camera-capture' },
        extra: { facing },
      });
    } finally {
      setCapturing(false);
    }
  }

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    startScan('text', undefined, q);
    setQuery('');
  }

  const modeToggle = (
    <View
      style={[
        styles.modeToggle,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Pressable
        style={[
          styles.modeTab,
          inputMode === 'camera' && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setInputMode('camera')}
        accessibilityRole="button"
        accessibilityLabel={t('cameraModeLabel')}
        accessibilityState={{ selected: inputMode === 'camera' }}
      >
        <Text
          style={[
            styles.modeTabText,
            { color: inputMode === 'camera' ? '#fff' : theme.colors.text },
          ]}
        >
          {t('cameraTab')}
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.modeTab,
          inputMode === 'search' && { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => setInputMode('search')}
        accessibilityRole="button"
        accessibilityLabel={t('searchModeLabel')}
        accessibilityState={{ selected: inputMode === 'search' }}
      >
        <Text
          style={[
            styles.modeTabText,
            { color: inputMode === 'search' ? '#fff' : theme.colors.text },
          ]}
        >
          {t('searchTab')}
        </Text>
      </Pressable>
    </View>
  );

  // ── Search mode ──────────────────────────────────────────────────────────
  if (inputMode === 'search') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {modeToggle}
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                fontSize: theme.typography.fontSizeBase,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel={t('searchInputA11y')}
          />
          <Pressable
            style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel={t('searchButtonA11y')}
          >
            <Text style={styles.searchButtonText}>{t('searchButton')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Web camera mode ───────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <>
        {React.createElement('input', {
          testID: 'web-file-input',
          ref: webInputRef,
          type: 'file',
          accept: 'image/*',
          capture: 'environment',
          style: { display: 'none' },
          onChange: handleWebFileChange,
        })}
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {modeToggle}
          <Pressable
            style={[styles.webCaptureButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => webInputRef.current?.click()}
            accessibilityRole="button"
            accessibilityLabel={t('captureA11y')}
            accessibilityHint={t('captureHint')}
          >
            <Text style={styles.webCaptureButtonText}>{t('takePhoto')}</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ── Native camera mode — permission checks ────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {modeToggle}
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {modeToggle}
        <Text
          style={[
            styles.permissionText,
            { color: theme.colors.text, fontSize: theme.typography.fontSizeBase },
          ]}
        >
          {t('permissionText')}
        </Text>
        <Pressable
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel={t('allowCameraA11y')}
        >
          <Text style={[styles.permissionButtonText, { fontSize: theme.typography.fontSizeBase }]}>
            {t('allowCamera')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Native camera view ────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <View style={styles.overlay}>
        {modeToggle}
        <View style={[styles.frame, { borderColor: theme.colors.primary }]} />
        <View style={styles.cameraControls}>
          <Pressable
            style={styles.flipButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityRole="button"
            accessibilityLabel={t('flipCameraA11y')}
          >
            <Text style={styles.flipButtonText}>{t('flipCamera')}</Text>
          </Pressable>
          <Pressable
            style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCapture}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel={t('captureA11y')}
            accessibilityHint={t('captureHint')}
          >
            <View style={[styles.captureInner, { backgroundColor: theme.colors.background }]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    margin: 16,
  },
  modeTab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  modeTabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  frame: {
    width: 240,
    height: 340,
    borderWidth: 2,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  flipButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  webCaptureButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCaptureButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  searchContainer: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  searchButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  permissionText: {
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

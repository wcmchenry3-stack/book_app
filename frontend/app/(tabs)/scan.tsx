import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { useTranslation } from 'react-i18next';

import { Sentry } from '../../lib/sentry';
import { useTheme } from '../../hooks/useTheme';
import { useScanJobs } from '../../hooks/useScanJobs';
import { useBanner } from '../../hooks/useBanner';

type InputMode = 'camera' | 'search';
type CameraFacing = 'back' | 'front';

export default function ScanScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('scan');
  const { startScan } = useScanJobs();
  const { showBanner } = useBanner();
  const [permission, requestPermission] = useCameraPermissions();
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [query, setQuery] = useState('');
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const captureSeq = useRef(0);
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
    // Track which pipeline stage is executing so the catch block can tag the
    // failure precisely. Each silent failure previously looked identical in Sentry.
    let stage: 'take_picture' | 'dir_create' | 'file_copy' | 'start_scan' = 'take_picture';
    try {
      // Wrap takePictureAsync in a 10s timeout — without this, a hung native
      // promise makes the whole flow silently stall with no Sentry signal.
      const photo = await Promise.race([
        cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('takePictureAsync timeout after 10s')), 10000)
        ),
      ]);
      if (!photo?.uri) {
        Sentry.addBreadcrumb({
          category: 'scan',
          message: 'takePictureAsync returned no URI',
          level: 'warning',
        });
        return;
      }

      // Heal corruption from the pre-#174 bug: if an earlier version of the app
      // wrote a File (not a Directory) at the scan-queue path, delete it so the
      // Directory.create() call below doesn't collide with it.
      stage = 'dir_create';
      try {
        const stalePath = new File(Paths.document, 'scan-queue');
        if (stalePath.exists) {
          stalePath.delete();
          Sentry.addBreadcrumb({
            category: 'scan',
            message: 'Removed stale scan-queue file from pre-#174 state',
            level: 'info',
          });
        }
      } catch {
        // Best-effort cleanup — if this throws we'll still attempt create() below
        // and surface that failure to the user.
      }

      // Copy temp file to persistent document directory. idempotent: true means
      // create() is a no-op when the directory already exists (expo-file-system
      // otherwise throws). intermediates: true guards first-launch edge cases.
      const destDir = new Directory(Paths.document, 'scan-queue');
      destDir.create({ intermediates: true, idempotent: true });

      stage = 'file_copy';
      // Sequence counter prevents filename collisions if two captures land in
      // the same millisecond (double-tap race).
      const seq = captureSeq.current++;
      const destFile = new File(destDir, `${Date.now()}-${seq}.jpg`);
      const sourceFile = new File(photo.uri);
      sourceFile.copy(destFile);

      stage = 'start_scan';
      Sentry.addBreadcrumb({
        category: 'scan',
        message: 'Photo saved, starting scan',
        level: 'info',
        data: { destUri: destFile.uri },
      });
      startScan('image', destFile.uri);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'camera-capture', stage },
        extra: { facing },
      });
      // Give the user visible feedback instead of just logging to Sentry. The
      // original bug shipped precisely because this catch was silent.
      showBanner({
        message: t('scanFailedMessage'),
        type: 'error',
        actions: [{ label: t('retryNow'), onPress: () => handleCapture() }],
        duration: 8000,
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
    <View style={[styles.modeToggle, { backgroundColor: theme.colors.surfaceContainerLow }]}>
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
            { color: inputMode === 'camera' ? theme.colors.onPrimary : theme.colors.secondary },
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
            { color: inputMode === 'search' ? theme.colors.onPrimary : theme.colors.secondary },
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
                backgroundColor: theme.colors.surfaceContainerHighest,
                color: theme.colors.onSurface,
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
      {/* box-none: overlay itself doesn't intercept touches, but its Pressable
          children still receive them. Without this, iOS was swallowing the
          shutter press on top of the CameraView. */}
      <View style={styles.overlay} pointerEvents="box-none">
        {modeToggle}
        <View style={[styles.frame, { borderColor: theme.colors.primary }]} pointerEvents="none" />
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
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
    padding: 4,
  },
  modeTab: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 10,
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
    borderRadius: 12,
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

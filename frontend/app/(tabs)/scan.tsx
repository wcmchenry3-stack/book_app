import React, { useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

import { BookCandidatePicker, EnrichedBook } from '../../components/BookCandidatePicker';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../lib/api';

type InputMode = 'camera' | 'search';
type ScreenState = 'idle' | 'loading' | 'picker';
type CameraFacing = 'back' | 'front';

export default function ScanScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [candidates, setCandidates] = useState<EnrichedBook[]>([]);
  const [query, setQuery] = useState('');
  const [facing, setFacing] = useState<CameraFacing>('back');
  const cameraRef = useRef<CameraView>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webInputRef = useRef<any>(null);

  function handleScanError(err: unknown) {
    if (isAxiosError(err) && err.response?.status === 503) {
      Alert.alert(t('scanUnavailableTitle'), t('scanUnavailableMessage'));
    } else {
      Alert.alert(t('scanFailedTitle'), t('scanFailedMessage'));
    }
  }

  async function submitScan(formData: FormData) {
    const response = await api.post<EnrichedBook[]>('/scan', formData, {
      // transformRequest runs after all header merging, so we can adjust
      // Content-Type reliably here:
      //   Web   — delete it; the browser XHR sets multipart/form-data with the
      //           correct boundary automatically when the body is a FormData.
      //   Native — set it explicitly; React Native's network layer adds the
      //            boundary when the hint is 'multipart/form-data'.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformRequest: [(data: FormData, headers: any) => {
        if (Platform.OS === 'web') {
          headers.delete('Content-Type');
        } else {
          headers.set('Content-Type', 'multipart/form-data');
        }
        return data;
      }],
    });
    if (!response.data || response.data.length === 0) {
      setScreenState('idle');
      Alert.alert(t('noBooksFoundTitle'), t('noBooksFoundMessage'));
      return;
    }
    setCandidates(response.data);
    setScreenState('picker');
  }

  // Web: file input onChange — receives a File object directly from the browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleWebFileChange(e: any) {
    const file: File | undefined = e?.target?.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    if (webInputRef.current) webInputRef.current.value = '';
    setScreenState('loading');
    try {
      const formData = new FormData();
      formData.append('file', file, 'scan.jpg');
      await submitScan(formData);
    } catch (err) {
      setScreenState('idle');
      handleScanError(err);
    }
  }

  // Native: camera shutter
  async function handleCapture() {
    if (!cameraRef.current) return;
    setScreenState('loading');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (!photo?.uri) {
        setScreenState('idle');
        return;
      }
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      await submitScan(formData);
    } catch (err) {
      setScreenState('idle');
      handleScanError(err);
    }
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setScreenState('loading');
    try {
      const response = await api.get<EnrichedBook[]>('/books/search', { params: { q } });
      if (!response.data || response.data.length === 0) {
        setScreenState('idle');
        Alert.alert(t('noResultsTitle'), t('noResultsMessage'));
        return;
      }
      setCandidates(response.data);
      setScreenState('picker');
    } catch {
      setScreenState('idle');
      Alert.alert(t('searchFailedTitle'), t('searchFailedMessage'));
    }
  }

  async function handleSelect(book: EnrichedBook) {
    setCandidates([]);
    setScreenState('loading');
    try {
      await api.post('/wishlist', book);
      setScreenState('idle');
      Alert.alert(t('addedTitle'), t('addedMessage', { title: book.title }));
    } catch {
      setScreenState('idle');
      Alert.alert(t('couldNotSaveTitle'), t('couldNotSaveMessage'));
    }
  }

  function handleDismiss() {
    setCandidates([]);
    setScreenState('idle');
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
    if (screenState === 'loading') {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <LoadingSpinner message={t('loading')} />
        </View>
      );
    }
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
        <BookCandidatePicker
          visible={screenState === 'picker'}
          candidates={candidates}
          onSelect={handleSelect}
          onDismiss={handleDismiss}
        />
      </View>
    );
  }

  // ── Web camera mode ───────────────────────────────────────────────────────
  // expo-camera's CameraView does not work reliably on iOS web browsers.
  // Use a native <input type="file" capture="environment"> instead — this
  // opens the device's built-in camera app (rear lens by default) and
  // returns a proper File object that FormData understands.
  if (Platform.OS === 'web') {
    return (
      <>
        {React.createElement('input', {
          // testID lets @testing-library/react-native find this node in tests
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
          {screenState === 'loading' ? (
            <LoadingSpinner message={t('loading')} />
          ) : (
            <Pressable
              style={[styles.webCaptureButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => webInputRef.current?.click()}
              accessibilityRole="button"
              accessibilityLabel={t('captureA11y')}
              accessibilityHint={t('captureHint')}
            >
              <Text style={styles.webCaptureButtonText}>{t('takePhoto')}</Text>
            </Pressable>
          )}
          <BookCandidatePicker
            visible={screenState === 'picker'}
            candidates={candidates}
            onSelect={handleSelect}
            onDismiss={handleDismiss}
          />
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
  // Keep CameraView always mounted during loading to prevent iOS from
  // re-triggering the camera permission dialog when the view re-mounts.
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          {modeToggle}
          {screenState === 'loading' ? (
            <LoadingSpinner message={t('loading')} />
          ) : (
            <>
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
                  accessibilityRole="button"
                  accessibilityLabel={t('captureA11y')}
                  accessibilityHint={t('captureHint')}
                >
                  <View
                    style={[styles.captureInner, { backgroundColor: theme.colors.background }]}
                  />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </CameraView>

      <BookCandidatePicker
        visible={screenState === 'picker'}
        candidates={candidates}
        onSelect={handleSelect}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: {
    flex: 1,
    width: '100%',
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

import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { BookCandidatePicker, EnrichedBook } from '../../components/BookCandidatePicker';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../lib/api';

type ScreenState = 'camera' | 'loading' | 'picker';

export default function ScanScreen() {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [screenState, setScreenState] = useState<ScreenState>('camera');
  const [candidates, setCandidates] = useState<EnrichedBook[]>([]);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (!cameraRef.current) return;
    setScreenState('loading');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo?.uri) {
        setScreenState('camera');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const response = await api.post<EnrichedBook[]>('/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.data || response.data.length === 0) {
        setScreenState('camera');
        Alert.alert('No books found', 'Point the camera at a book cover and try again.');
        return;
      }

      setCandidates(response.data);
      setScreenState('picker');
    } catch {
      setScreenState('camera');
      Alert.alert('Scan failed', 'Something went wrong. Please try again.');
    }
  }

  function handleSelect(book: EnrichedBook) {
    setCandidates([]);
    setScreenState('camera');
    // Phase 5: add to wishlist
    Alert.alert('Book selected', `"${book.title}" will be added to your wishlist in Phase 5.`);
  }

  function handleDismiss() {
    setCandidates([]);
    setScreenState('camera');
  }

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text
          style={[
            styles.permissionText,
            { color: theme.colors.text, fontSize: theme.typography.fontSizeBase },
          ]}
        >
          Camera access is required to scan books.
        </Text>
        <Pressable
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={[styles.permissionButtonText, { fontSize: theme.typography.fontSizeBase }]}>
            Allow Camera
          </Text>
        </Pressable>
      </View>
    );
  }

  if (screenState === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Identifying book…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={[styles.frame, { borderColor: theme.colors.primary }]} />
          <Pressable
            style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCapture}
            accessibilityRole="button"
            accessibilityLabel="Capture book cover"
            accessibilityHint="Takes a photo and identifies the book"
          >
            <View style={[styles.captureInner, { backgroundColor: theme.colors.background }]} />
          </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  frame: {
    width: 240,
    height: 340,
    borderWidth: 2,
    borderRadius: 8,
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

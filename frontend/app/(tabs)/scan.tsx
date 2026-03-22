import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { BookCandidatePicker, EnrichedBook } from '../../components/BookCandidatePicker';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../lib/api';

type InputMode = 'camera' | 'search';
type ScreenState = 'idle' | 'loading' | 'picker';

export default function ScanScreen() {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [candidates, setCandidates] = useState<EnrichedBook[]>([]);
  const [query, setQuery] = useState('');
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
        setScreenState('idle');
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
        setScreenState('idle');
        Alert.alert('No books found', 'Point the camera at a book cover and try again.');
        return;
      }

      setCandidates(response.data);
      setScreenState('picker');
    } catch {
      setScreenState('idle');
      Alert.alert('Scan failed', 'Something went wrong. Please try again.');
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
        Alert.alert('No results', 'No books found. Try a different title or author.');
        return;
      }

      setCandidates(response.data);
      setScreenState('picker');
    } catch {
      setScreenState('idle');
      Alert.alert('Search failed', 'Something went wrong. Please try again.');
    }
  }

  async function handleSelect(book: EnrichedBook) {
    setCandidates([]);
    setScreenState('loading');
    try {
      await api.post('/wishlist', book);
      setScreenState('idle');
      Alert.alert('Added to wishlist', `"${book.title}" has been added to your wishlist.`);
    } catch {
      setScreenState('idle');
      Alert.alert('Could not save', 'Failed to add book to wishlist. Please try again.');
    }
  }

  function handleDismiss() {
    setCandidates([]);
    setScreenState('idle');
  }

  if (screenState === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Identifying book…" />
      </View>
    );
  }

  const modeToggle = (
    <View style={[styles.modeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Pressable
        style={[styles.modeTab, inputMode === 'camera' && { backgroundColor: theme.colors.primary }]}
        onPress={() => setInputMode('camera')}
        accessibilityRole="button"
        accessibilityLabel="Camera scan mode"
        accessibilityState={{ selected: inputMode === 'camera' }}
      >
        <Text style={[styles.modeTabText, { color: inputMode === 'camera' ? '#fff' : theme.colors.text }]}>
          Camera
        </Text>
      </Pressable>
      <Pressable
        style={[styles.modeTab, inputMode === 'search' && { backgroundColor: theme.colors.primary }]}
        onPress={() => setInputMode('search')}
        accessibilityRole="button"
        accessibilityLabel="Text search mode"
        accessibilityState={{ selected: inputMode === 'search' }}
      >
        <Text style={[styles.modeTabText, { color: inputMode === 'search' ? '#fff' : theme.colors.text }]}>
          Search
        </Text>
      </Pressable>
    </View>
  );

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
            placeholder="e.g. John Adams by McCullough"
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Book title or author search"
          />
          <Pressable
            style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="Search for book"
          >
            <Text style={styles.searchButtonText}>Search</Text>
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

  // Camera mode
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

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          {modeToggle}
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

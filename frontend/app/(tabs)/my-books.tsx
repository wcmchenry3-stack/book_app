import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../lib/api';

type Status = 'all' | 'wishlisted' | 'purchased' | 'reading' | 'read';

interface UserBook {
  id: string;
  status: string;
  rating: number | null;
  notes: string | null;
  wishlisted_at: string | null;
  purchased_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    description: string | null;
  };
  edition: {
    publish_year: number | null;
    publisher: string | null;
    page_count: number | null;
  } | null;
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wishlisted', label: 'Wishlist' },
  { key: 'purchased', label: 'Purchased' },
  { key: 'reading', label: 'Reading' },
  { key: 'read', label: 'Read' },
];

const NEXT_STATUS: Record<string, string> = {
  wishlisted: 'purchased',
  purchased: 'reading',
  reading: 'read',
};

export default function MyBooksScreen() {
  const { theme } = useTheme();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Status>('all');
  const [selected, setSelected] = useState<UserBook | null>(null);

  async function fetchBooks(tab: Status = activeTab) {
    try {
      const params = tab !== 'all' ? { status: tab } : {};
      const { data } = await api.get<UserBook[]>('/user-books', { params });
      setBooks(data);
    } catch {
      Alert.alert('Error', 'Could not load books.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBooks(activeTab);
    }, [activeTab])
  );

  function handleTabChange(tab: Status) {
    setActiveTab(tab);
    setLoading(true);
    fetchBooks(tab);
  }

  async function handleAdvanceStatus(item: UserBook) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    try {
      await api.patch(`/user-books/${item.id}`, { status: next });
      setSelected(null);
      fetchBooks();
    } catch {
      Alert.alert('Error', 'Could not update status.');
    }
  }

  async function handleRemove(item: UserBook) {
    try {
      await api.delete(`/user-books/${item.id}`);
      setSelected(null);
      setBooks((prev) => prev.filter((b) => b.id !== item.id));
    } catch {
      Alert.alert('Error', 'Could not remove book.');
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading books…" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleTabChange(tab.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${tab.label}`}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? '#FFFFFF' : theme.colors.text,
                    fontSize: theme.typography.fontSizeSM,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBooks();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase },
            ]}
          >
            No books here yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setSelected(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.book.title} — ${item.status}`}
            accessibilityHint="Tap to see details and options"
          >
            {item.book.cover_url ? (
              <Image
                source={{ uri: item.book.cover_url }}
                style={styles.cover}
                accessibilityLabel={`Cover of ${item.book.title}`}
              />
            ) : (
              <View
                style={[
                  styles.cover,
                  styles.coverPlaceholder,
                  { backgroundColor: theme.colors.border },
                ]}
                accessibilityLabel="No cover available"
              />
            )}

            <View style={styles.info}>
              <Text
                style={[
                  styles.bookTitle,
                  { color: theme.colors.text, fontSize: theme.typography.fontSizeBase },
                ]}
                numberOfLines={2}
              >
                {item.book.title}
              </Text>
              <Text
                style={[
                  { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSM },
                ]}
                numberOfLines={1}
              >
                {item.book.author}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '22' }]}>
                <Text style={[styles.statusText, { color: theme.colors.primary, fontSize: 11 }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Detail sheet */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
        accessibilityViewIsModal
      >
        {selected && (
          <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: theme.colors.text, fontSize: theme.typography.fontSizeLG },
                ]}
                accessibilityRole="header"
                numberOfLines={2}
              >
                {selected.book.title}
              </Text>
              <Pressable
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Close detail"
                style={styles.closeButton}
                hitSlop={8}
              >
                <Text
                  style={{ color: theme.colors.primary, fontSize: theme.typography.fontSizeBase }}
                >
                  Close
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              {selected.book.cover_url && (
                <Image
                  source={{ uri: selected.book.cover_url }}
                  style={styles.sheetCover}
                  accessibilityLabel={`Cover of ${selected.book.title}`}
                />
              )}
              <Text
                style={[
                  styles.sheetAuthor,
                  { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase },
                ]}
              >
                {selected.book.author}
              </Text>
              {selected.book.description && (
                <Text
                  style={[
                    styles.sheetDescription,
                    { color: theme.colors.text, fontSize: theme.typography.fontSizeSM },
                  ]}
                >
                  {selected.book.description}
                </Text>
              )}
              {selected.edition?.page_count && (
                <Text
                  style={[
                    { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSM },
                  ]}
                >
                  {selected.edition.page_count} pages
                </Text>
              )}

              {NEXT_STATUS[selected.status] && (
                <Pressable
                  style={[styles.sheetButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleAdvanceStatus(selected)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark as ${NEXT_STATUS[selected.status]}`}
                >
                  <Text
                    style={[styles.sheetButtonText, { fontSize: theme.typography.fontSizeBase }]}
                  >
                    Mark as {NEXT_STATUS[selected.status]}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.sheetButton, { backgroundColor: theme.colors.border }]}
                onPress={() => handleRemove(selected)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${selected.book.title}`}
              >
                <Text
                  style={[
                    styles.sheetButtonText,
                    { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase },
                  ]}
                >
                  Remove from list
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabText: { fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 44,
  },
  cover: { width: 72, height: 108 },
  coverPlaceholder: { opacity: 0.4 },
  info: { flex: 1, padding: 12, gap: 4 },
  bookTitle: { fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: { fontWeight: '600' },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontWeight: '700', flex: 1, marginRight: 8 },
  closeButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  sheetContent: { padding: 16, gap: 12, alignItems: 'center' },
  sheetCover: { width: 120, height: 180, borderRadius: 4 },
  sheetAuthor: { alignSelf: 'flex-start' },
  sheetDescription: { lineHeight: 20 },
  sheetButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  sheetButtonText: { fontWeight: '600', color: '#FFFFFF' },
});

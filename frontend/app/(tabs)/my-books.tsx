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
import { useTranslation } from 'react-i18next';

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

const STATUS_TAB_KEYS: Status[] = ['all', 'wishlisted', 'purchased', 'reading', 'read'];

const NEXT_STATUS: Record<string, string> = {
  wishlisted: 'purchased',
  purchased: 'reading',
  reading: 'read',
};

export default function MyBooksScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('my-books');
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Status>('all');
  const [selected, setSelected] = useState<UserBook | null>(null);

  async function fetchBooks(tab: Status = activeTab) {
    try {
      const params = tab !== 'all' ? { status: tab } : {};
      const { data } = await api.get<UserBook[]>('/user-books', { params });
      setBooks(data.filter((b) => b.book != null));
    } catch {
      Alert.alert(t('errorTitle', { ns: 'common' }), t('errorLoadBooks'));
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
    // Optimistic: on "all" tab update status in-place; on filtered tabs remove the item
    setBooks((prev) =>
      activeTab === 'all'
        ? prev.map((b) => (b.id === item.id ? { ...b, status: next } : b))
        : prev.filter((b) => b.id !== item.id)
    );
    setSelected(null);
    try {
      await api.patch(`/user-books/${item.id}`, { status: next });
    } catch {
      setBooks((prev) =>
        activeTab === 'all'
          ? prev.map((b) => (b.id === item.id ? { ...b, status: item.status } : b))
          : [...prev, item]
      );
      Alert.alert(t('errorTitle', { ns: 'common' }), t('errorUpdateStatus'));
    }
  }

  async function handleRemove(item: UserBook) {
    setBooks((prev) => prev.filter((b) => b.id !== item.id));
    setSelected(null);
    try {
      await api.delete(`/user-books/${item.id}`);
    } catch {
      setBooks((prev) => [...prev, item]);
      Alert.alert(t('errorTitle', { ns: 'common' }), t('errorRemoveBook'));
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message={t('loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        <View style={[styles.tabsTrack, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          {STATUS_TAB_KEYS.map((key) => {
            const active = activeTab === key;
            const label = t(`statusTab.${key}`);
            return (
              <Pressable
                key={key}
                style={[styles.tab, active && { backgroundColor: theme.colors.primary }]}
                onPress={() => handleTabChange(key)}
                accessibilityRole="button"
                accessibilityLabel={t('filterBy', { label })}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active ? theme.colors.onPrimary : theme.colors.secondary,
                      fontSize: theme.typography.fontSizeSM,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {books.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase },
            ]}
          >
            {t('noBooksYet')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.colors.surfaceContainerLow }]}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={t('bookCardA11y', {
                title: item.book.title,
                status: item.status,
              })}
              accessibilityHint={t('bookCardHint')}
            >
              {item.book.cover_url ? (
                <Image
                  source={{ uri: item.book.cover_url }}
                  style={styles.cover}
                  accessibilityLabel={t('coverAlt', { ns: 'common', title: item.book.title })}
                />
              ) : (
                <View
                  style={[
                    styles.cover,
                    styles.coverPlaceholder,
                    { backgroundColor: theme.colors.border },
                  ]}
                  accessibilityLabel={t('noCoverAvailable', { ns: 'common' })}
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
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === 'reading'
                          ? theme.colors.primary
                          : item.status === 'read'
                            ? theme.colors.secondaryContainer
                            : theme.colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          item.status === 'reading'
                            ? theme.colors.onPrimary
                            : item.status === 'read'
                              ? theme.colors.onSecondaryContainer
                              : theme.colors.onSurfaceVariant,
                        fontSize: 11,
                      },
                    ]}
                  >
                    {t(`status.${item.status}`, item.status)}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Detail sheet */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
        accessibilityViewIsModal
      >
        {selected && (
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
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
                accessibilityLabel={t('closeDetail')}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Text
                  style={{ color: theme.colors.primary, fontSize: theme.typography.fontSizeBase }}
                >
                  {t('close', { ns: 'common' })}
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              {selected.book.cover_url && (
                <Image
                  source={{ uri: selected.book.cover_url }}
                  style={styles.sheetCover}
                  accessibilityLabel={t('coverAlt', { ns: 'common', title: selected.book.title })}
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
                  {t('pages', { count: selected.edition.page_count })}
                </Text>
              )}

              {NEXT_STATUS[selected.status] && (
                <Pressable
                  style={[styles.sheetButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleAdvanceStatus(selected)}
                  accessibilityRole="button"
                  accessibilityLabel={t('markAsA11y', {
                    status: t(`status.${NEXT_STATUS[selected.status]}`),
                  })}
                >
                  <Text
                    style={[styles.sheetButtonText, { fontSize: theme.typography.fontSizeBase }]}
                  >
                    {t('markAs', { status: t(`status.${NEXT_STATUS[selected.status]}`) })}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.sheetButton, { backgroundColor: theme.colors.surfaceContainerHigh }]}
                onPress={() => handleRemove(selected)}
                accessibilityRole="button"
                accessibilityLabel={t('removeBookA11y', { title: selected.book.title })}
              >
                <Text
                  style={[
                    styles.sheetButtonText,
                    {
                      color: theme.colors.onSurfaceVariant,
                      fontSize: theme.typography.fontSizeBase,
                    },
                  ]}
                >
                  {t('removeFromList')}
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
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  tabsTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabText: { fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
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

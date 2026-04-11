import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

const SCREEN_PADDING = 16;
const COLUMN_GAP = 12;
const NUM_COLUMNS = 2;

function cardWidth() {
  const screenWidth = Dimensions.get('window').width;
  return (screenWidth - SCREEN_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
}

function statusBadgeColors(
  status: string,
  theme: ReturnType<typeof import('../../hooks/useTheme').useTheme>['theme']
) {
  if (status === 'reading')
    return { bg: theme.colors.primary, text: theme.colors.onPrimary, overlay: true };
  if (status === 'read')
    return {
      bg: theme.colors.secondaryContainer,
      text: theme.colors.onSecondaryContainer,
      overlay: true,
    };
  // wishlisted / purchased — subtle chip below author
  return {
    bg: theme.colors.surfaceContainerHigh,
    text: theme.colors.onSurfaceVariant,
    overlay: false,
  };
}

export default function MyBooksScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('my-books');
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Status>('all');
  const [selected, setSelected] = useState<UserBook | null>(null);
  const [query, setQuery] = useState('');

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
    setQuery('');
    setLoading(true);
    fetchBooks(tab);
  }

  async function handleAdvanceStatus(item: UserBook) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
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

  const filteredBooks = useMemo(() => {
    if (!query.trim()) return books;
    const q = query.toLowerCase();
    return books.filter(
      (b) => b.book.title.toLowerCase().includes(q) || b.book.author.toLowerCase().includes(q)
    );
  }, [books, query]);

  const cw = cardWidth();
  const coverHeight = cw * 1.5;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message={t('loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View
          style={[styles.searchWrap, { backgroundColor: theme.colors.surfaceContainerHighest }]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.outline}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.colors.onSurface, fontSize: theme.typography.fontSizeBase },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={theme.colors.outline}
            returnKeyType="search"
            accessibilityLabel={t('searchA11y')}
          />
        </View>
      </View>

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
                      color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
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

      {/* Section header */}
      {books.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurface, fontFamily: theme.typography.fontFamilyHeadline },
            ]}
          >
            {t('sectionTitle')}
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: theme.colors.secondary, fontSize: theme.typography.fontSizeSM },
            ]}
          >
            {t('bookCount', { count: books.length })}
          </Text>
        </View>
      )}

      {/* Book grid */}
      {filteredBooks.length === 0 ? (
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
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
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
          renderItem={({ item }) => {
            const badge = statusBadgeColors(item.status, theme);
            return (
              <Pressable
                style={[styles.card, { width: cw }]}
                onPress={() => setSelected(item)}
                accessibilityRole="button"
                accessibilityLabel={t('bookCardA11y', {
                  title: item.book.title,
                  status: item.status,
                })}
                accessibilityHint={t('bookCardHint')}
              >
                {/* Cover */}
                <View
                  style={[
                    styles.coverWrap,
                    {
                      width: cw,
                      height: coverHeight,
                      backgroundColor: theme.colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  {item.book.cover_url ? (
                    <Image
                      source={{ uri: item.book.cover_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      accessibilityLabel={t('coverAlt', { ns: 'common', title: item.book.title })}
                    />
                  ) : (
                    <View
                      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.border }]}
                      accessibilityLabel={t('noCoverAvailable', { ns: 'common' })}
                    />
                  )}
                  {badge.overlay && (
                    <View style={[styles.badgeOverlay, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {t(`status.${item.status}`, item.status)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Title + author */}
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: theme.colors.onSurface,
                      fontFamily: theme.typography.fontFamilyHeadline,
                      fontSize: theme.typography.fontSizeBase,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.book.title}
                </Text>
                <Text
                  style={[
                    styles.cardAuthor,
                    { color: theme.colors.secondary, fontSize: theme.typography.fontSizeXS },
                  ]}
                  numberOfLines={1}
                >
                  {item.book.author}
                </Text>
                {/* Status chip for non-overlay statuses */}
                {!badge.overlay && (
                  <View style={[styles.statusChip, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {t(`status.${item.status}`, item.status)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
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
                    style={[
                      styles.sheetButtonText,
                      { fontSize: theme.typography.fontSizeBase, color: theme.colors.onPrimary },
                    ]}
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

  // Search
  searchRow: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%' },

  // Filter tabs
  tabsContainer: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 8 },
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

  // Section header
  sectionHeader: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  sectionSubtitle: { fontWeight: '500', opacity: 0.8 },

  // Grid
  gridContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 32,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: 24,
  },
  card: { flexDirection: 'column' },

  // Book card cover
  coverWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 2,
  },
  cardAuthor: {
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Empty / loading
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center' },

  // Detail sheet
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
  sheetButtonText: { fontWeight: '600' },
});

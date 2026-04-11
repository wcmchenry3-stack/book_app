import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../lib/api';

interface UserBook {
  id: string;
  status: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
  edition: {
    publish_year: number | null;
  } | null;
}

export default function WishlistScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('wishlist');
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchWishlist() {
    try {
      const { data } = await api.get<UserBook[]>('/user-books', {
        params: { status: 'wishlisted' },
      });
      setBooks(data);
    } catch {
      Alert.alert(t('errorTitle', { ns: 'common' }), t('errorLoadWishlist'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWishlist();
    }, [])
  );

  async function handleMarkPurchased(item: UserBook) {
    setBooks((prev) => prev.filter((b) => b.id !== item.id));
    try {
      await api.patch(`/user-books/${item.id}`, { status: 'purchased' });
    } catch {
      setBooks((prev) => [...prev, item]);
      Alert.alert(t('errorTitle', { ns: 'common' }), t('errorUpdateStatus'));
    }
  }

  async function handleRemove(item: UserBook) {
    setBooks((prev) => prev.filter((b) => b.id !== item.id));
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

  if (books.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.emptyContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase },
          ]}
        >
          {t('empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWishlist();
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceContainerLow }]}>
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
              {item.edition?.publish_year ? (
                <Text
                  style={[
                    { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSM },
                  ]}
                >
                  {item.edition.publish_year}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleMarkPurchased(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('markPurchasedA11y', { title: item.book.title })}
                >
                  <Text style={[styles.actionText, { fontSize: theme.typography.fontSizeSM, color: theme.colors.onPrimary }]}>
                    {t('markPurchased')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.surfaceContainerHigh },
                  ]}
                  onPress={() => handleRemove(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('removeA11y', { title: item.book.title })}
                >
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: theme.colors.onSurfaceVariant,
                        fontSize: theme.typography.fontSizeSM,
                      },
                    ]}
                  >
                    {t('remove')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { textAlign: 'center', lineHeight: 24 },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  actionText: { fontWeight: '600' },
});

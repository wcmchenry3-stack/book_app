import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';

export interface EnrichedBook {
  book_id?: string;
  open_library_work_id?: string;
  google_books_id?: string;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  subjects: string[];
  confidence: number;
  already_in_library: boolean;
  editions: {
    isbn_13?: string;
    isbn_10?: string;
    publisher?: string;
    publish_year?: number;
    page_count?: number;
    format?: string;
  }[];
}

interface Props {
  visible: boolean;
  candidates: EnrichedBook[];
  onSelect: (book: EnrichedBook) => void;
  onDismiss: () => void;
}

export function BookCandidatePicker({ visible, candidates, onSelect, onDismiss }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation('components');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontSize: theme.typography.fontSizeLG },
            ]}
            accessibilityRole="header"
          >
            {t('bookCandidatePicker.title')}
          </Text>
          <Pressable
            onPress={onDismiss}
            accessibilityLabel={t('bookCandidatePicker.closePicker')}
            accessibilityRole="button"
            style={styles.closeButton}
            hitSlop={8}
          >
            <Text style={{ color: theme.colors.primary, fontSize: theme.typography.fontSizeBase }}>
              {t('bookCandidatePicker.cancel')}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {candidates.map((book, i) => (
            <Pressable
              key={`${book.open_library_work_id ?? book.title}-${i}`}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => onSelect(book)}
              accessibilityLabel={t('bookCandidatePicker.selectBook', {
                title: book.title,
                author: book.author,
              })}
              accessibilityRole="button"
              accessibilityHint={t('bookCandidatePicker.addToWishlistHint')}
            >
              {book.cover_url ? (
                <Image
                  source={{ uri: book.cover_url }}
                  style={styles.cover}
                  accessibilityLabel={t('coverAlt', { ns: 'common', title: book.title })}
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
                  {book.title}
                </Text>
                <Text
                  style={[
                    { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSM },
                  ]}
                  numberOfLines={1}
                >
                  {book.author}
                </Text>
                {book.editions[0]?.publish_year && (
                  <Text
                    style={[
                      { color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeSM },
                    ]}
                  >
                    {book.editions[0].publish_year}
                  </Text>
                )}
                {book.already_in_library && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.onSuccess }]}>
                      {t('bookCandidatePicker.alreadyOwned')}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}

          <Pressable
            style={[styles.noneButton, { borderColor: theme.colors.border }]}
            onPress={onDismiss}
            accessibilityLabel={t('bookCandidatePicker.noneOfTheseA11y')}
            accessibilityRole="button"
          >
            <Text
              style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSizeBase }}
            >
              {t('bookCandidatePicker.noneOfThese')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontWeight: '700' },
  closeButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  list: { padding: 16, gap: 12 },
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  noneButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: 'center',
  },
});

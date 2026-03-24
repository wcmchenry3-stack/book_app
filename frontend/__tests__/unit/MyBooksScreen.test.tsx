import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import MyBooksScreen from '../../app/(tabs)/my-books';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(cb, []);
  },
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        surface: '#f5f5f5',
        border: '#ccc',
        text: '#000',
        textSecondary: '#888',
        primary: '#007AFF',
      },
      typography: { fontSizeBase: 16, fontSizeSM: 14, fontSizeLG: 20 },
    },
  }),
}));

jest.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => {
    const { Text } = require('react-native');
    return <Text testID="loading-spinner">{message ?? 'Loading'}</Text>;
  },
}));

const WISHLISTED_BOOK = {
  id: 'ub-1',
  status: 'wishlisted',
  rating: null,
  notes: null,
  wishlisted_at: null,
  purchased_at: null,
  started_at: null,
  finished_at: null,
  book: {
    id: 'b-1',
    title: 'Dune',
    author: 'Frank Herbert',
    cover_url: null,
    description: 'A desert planet epic.',
  },
  edition: { publish_year: 1965, publisher: 'Ace Books', page_count: 604 },
};

const READING_BOOK = {
  ...WISHLISTED_BOOK,
  id: 'ub-2',
  status: 'reading',
  book: { ...WISHLISTED_BOOK.book, id: 'b-2', title: 'Foundation' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: [] });
  mockPatch.mockResolvedValue({ data: {} });
  mockDelete.mockResolvedValue({});
});

describe('MyBooksScreen', () => {
  it('shows loading spinner on mount', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<MyBooksScreen />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('shows empty state when no books', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { getByText } = render(<MyBooksScreen />);
    await waitFor(() => expect(getByText('No books here yet.')).toBeTruthy());
  });

  it('renders all filter tabs', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { getByText } = render(<MyBooksScreen />);
    await waitFor(() => {
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Wishlist')).toBeTruthy();
      expect(getByText('Purchased')).toBeTruthy();
      expect(getByText('Reading')).toBeTruthy();
      expect(getByText('Read')).toBeTruthy();
    });
  });

  it('renders book titles when data loaded', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByText } = render(<MyBooksScreen />);
    await waitFor(() => {
      expect(getByText('Dune')).toBeTruthy();
      expect(getByText('Frank Herbert')).toBeTruthy();
    });
  });

  it('renders status badge on each card', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByText } = render(<MyBooksScreen />);
    await waitFor(() => expect(getByText('Wishlisted')).toBeTruthy());
  });

  it('opens detail sheet when card is tapped', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText, getByText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));

    fireEvent.press(getByLabelText('Dune — wishlisted'));

    await waitFor(() => expect(getByText('A desert planet epic.')).toBeTruthy());
  });

  it('shows page count in detail sheet', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText, getByText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));
    fireEvent.press(getByLabelText('Dune — wishlisted'));
    await waitFor(() => expect(getByText('604 pages')).toBeTruthy());
  });

  it('closes detail sheet when Close pressed', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText, queryByText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));
    fireEvent.press(getByLabelText('Dune — wishlisted'));
    await waitFor(() => getByLabelText('Close detail'));
    fireEvent.press(getByLabelText('Close detail'));
    await waitFor(() => expect(queryByText('A desert planet epic.')).toBeNull());
  });

  it('shows advance status button for wishlisted books', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));
    fireEvent.press(getByLabelText('Dune — wishlisted'));
    await waitFor(() => expect(getByLabelText('Mark as Purchased')).toBeTruthy());
  });

  it('calls PATCH when advance status button pressed', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));
    fireEvent.press(getByLabelText('Dune — wishlisted'));
    await waitFor(() => getByLabelText('Mark as Purchased'));

    await act(async () => {
      fireEvent.press(getByLabelText('Mark as Purchased'));
    });

    expect(mockPatch).toHaveBeenCalledWith('/user-books/ub-1', { status: 'purchased' });
  });

  it('does not show advance button for read books', async () => {
    const readBook = { ...WISHLISTED_BOOK, status: 'read' };
    mockGet.mockResolvedValue({ data: [readBook] });
    const { getByLabelText, queryByLabelText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — read'));
    fireEvent.press(getByLabelText('Dune — read'));
    await waitFor(() => expect(queryByLabelText(/Mark as/)).toBeNull());
  });

  it('calls DELETE when Remove pressed in detail sheet', async () => {
    mockGet.mockResolvedValue({ data: [WISHLISTED_BOOK] });
    const { getByLabelText } = render(<MyBooksScreen />);
    await waitFor(() => getByLabelText('Dune — wishlisted'));
    fireEvent.press(getByLabelText('Dune — wishlisted'));
    await waitFor(() => getByLabelText('Remove Dune'));

    await act(async () => {
      fireEvent.press(getByLabelText('Remove Dune'));
    });

    expect(mockDelete).toHaveBeenCalledWith('/user-books/ub-1');
  });

  it('refetches when a filter tab is tapped', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { getByText } = render(<MyBooksScreen />);
    await waitFor(() => getByText('Reading'));
    await act(async () => {
      fireEvent.press(getByText('Reading'));
    });
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/user-books', { params: { status: 'reading' } })
    );
  });
});

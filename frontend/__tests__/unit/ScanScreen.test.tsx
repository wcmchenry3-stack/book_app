import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ScanScreen from '../../app/(tabs)/scan';

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockTakePictureAsync = jest.fn();
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => {
  const React = require('react');
  const MockCameraView = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePictureAsync }));
      return <>{children}</>;
    }
  );
  MockCameraView.displayName = 'CameraView';
  return {
    CameraView: MockCameraView,
    useCameraPermissions: jest.fn(),
  };
});

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
        iconActive: '#000',
      },
      typography: { fontSizeBase: 16 },
      spacing: { md: 16 },
    },
  }),
}));

jest.mock('../../components/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => {
    const { Text } = require('react-native');
    return <Text testID="loading-spinner">{message}</Text>;
  },
}));

jest.mock('../../components/BookCandidatePicker', () => ({
  BookCandidatePicker: ({
    visible,
    onSelect,
    onDismiss,
    candidates,
  }: {
    visible: boolean;
    onSelect: (book: unknown) => void;
    onDismiss: () => void;
    candidates: { title: string }[];
  }) => {
    if (!visible) return null;
    const { Text, Pressable } = require('react-native');
    return (
      <>
        <Pressable testID="dismiss-picker" onPress={onDismiss}>
          <Text>dismiss</Text>
        </Pressable>
        {candidates.map((c, i) => (
          <Pressable key={i} testID={`select-book-${i}`} onPress={() => onSelect(c)}>
            <Text>{c.title}</Text>
          </Pressable>
        ))}
      </>
    );
  },
}));

jest.mock('axios', () => ({
  isAxiosError: (e: unknown) => (e as { isAxiosError?: boolean }).isAxiosError === true,
}));

const { useCameraPermissions } = require('expo-camera');

function makeAxiosError(status: number) {
  return Object.assign(new Error('axios'), {
    isAxiosError: true,
    response: { status },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useCameraPermissions.mockReturnValue([{ granted: true }, mockRequestPermission]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Search mode
// ---------------------------------------------------------------------------
describe('ScanScreen — search mode', () => {
  function renderInSearchMode() {
    const utils = render(<ScanScreen />);
    fireEvent.press(utils.getByLabelText('Text search mode'));
    return utils;
  }

  it('renders search input and button after switching to search mode', () => {
    const { getByLabelText } = renderInSearchMode();
    expect(getByLabelText('Book title or author search')).toBeTruthy();
    expect(getByLabelText('Search for book')).toBeTruthy();
  });

  it('shows loading spinner while searching', async () => {
    let resolveGet!: (v: unknown) => void;
    mockGet.mockReturnValue(
      new Promise((res) => {
        resolveGet = res;
      })
    );
    const { getByLabelText, getByTestId } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    fireEvent.press(getByLabelText('Search for book'));
    expect(getByTestId('loading-spinner')).toBeTruthy();
    await act(async () => resolveGet({ data: [] }));
  });

  it('shows picker when search returns results', async () => {
    mockGet.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });
    const { getByLabelText, getByTestId } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    await waitFor(() => expect(getByTestId('dismiss-picker')).toBeTruthy());
  });

  it('alerts when search returns empty results', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { getByLabelText } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'xyz');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    expect(Alert.alert).toHaveBeenCalledWith('No results', expect.any(String));
  });

  it('alerts on search error', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    const { getByLabelText } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'xyz');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('does nothing if search query is empty', async () => {
    const { getByLabelText } = renderInSearchMode();
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('dismisses picker on dismiss press', async () => {
    mockGet.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });
    const { getByLabelText, getByTestId, queryByTestId } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    await waitFor(() => expect(getByTestId('dismiss-picker')).toBeTruthy());
    fireEvent.press(getByTestId('dismiss-picker'));
    expect(queryByTestId('dismiss-picker')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Camera mode — permissions
// ---------------------------------------------------------------------------
describe('ScanScreen — camera mode permissions', () => {
  it('renders capture button by default when permission is granted', () => {
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Capture book cover')).toBeTruthy();
  });

  it('renders flip camera button when permission is granted', () => {
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Flip camera')).toBeTruthy();
  });

  it('shows permission prompt when camera permission is not granted', () => {
    useCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Grant camera permission')).toBeTruthy();
  });

  it('requests permission when allow button is pressed', () => {
    useCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);
    const { getByLabelText } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Grant camera permission'));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('renders mode toggle when permission is loading (null)', () => {
    useCameraPermissions.mockReturnValue([null, mockRequestPermission]);
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Camera scan mode')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Camera mode — facing toggle
// ---------------------------------------------------------------------------
describe('ScanScreen — camera facing toggle', () => {
  it('shows flip button overlay in camera mode', () => {
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Flip camera')).toBeTruthy();
  });

  it('toggles facing state when flip button is pressed', () => {
    const { getByLabelText } = render(<ScanScreen />);
    const flipBtn = getByLabelText('Flip camera');
    // Press once: back → front
    fireEvent.press(flipBtn);
    // Press again: front → back — button still present
    fireEvent.press(flipBtn);
    expect(getByLabelText('Flip camera')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Camera mode — capture flow
// ---------------------------------------------------------------------------
describe('ScanScreen — capture flow', () => {
  it('shows loading spinner during capture', async () => {
    let resolveTake!: (v: unknown) => void;
    mockTakePictureAsync.mockReturnValue(
      new Promise((res) => {
        resolveTake = res;
      })
    );
    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Capture book cover'));
    expect(getByTestId('loading-spinner')).toBeTruthy();
    await act(async () => resolveTake({ uri: 'file://test.jpg' }));
  });

  it('shows picker after successful scan', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });

    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    await waitFor(() => expect(getByTestId('dismiss-picker')).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith('/scan', expect.any(FormData), expect.any(Object));
  });

  it('alerts when scan returns no books', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost.mockResolvedValue({ data: [] });

    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(Alert.alert).toHaveBeenCalledWith('No books found', expect.any(String));
  });

  it('alerts with scan-unavailable message on 503', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost.mockRejectedValue(makeAxiosError(503));

    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(Alert.alert).toHaveBeenCalledWith('Scan unavailable', expect.any(String));
  });

  it('alerts with generic scan-failed message on other errors', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost.mockRejectedValue(new Error('network'));

    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(Alert.alert).toHaveBeenCalledWith('Scan failed', expect.any(String));
  });

  it('exits early without alert when takePictureAsync returns no uri', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: null });

    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockPost).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('uses fetch blob path on web platform', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    const mockBlob = new Blob(['img'], { type: 'image/jpeg' });
    const mockFetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(mockBlob) });
    (global as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

    mockTakePictureAsync.mockResolvedValue({ uri: 'data:image/jpeg;base64,abc' });
    mockPost.mockResolvedValue({ data: [{ title: 'Test Book' }] });

    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    await waitFor(() => expect(getByTestId('dismiss-picker')).toBeTruthy());

    expect(mockFetch).toHaveBeenCalledWith('data:image/jpeg;base64,abc');

    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });
});

// ---------------------------------------------------------------------------
// Select book
// ---------------------------------------------------------------------------
describe('ScanScreen — select book', () => {
  it('posts to wishlist and alerts on success', async () => {
    mockGet.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });
    mockPost.mockResolvedValue({});
    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Text search mode'));
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    await waitFor(() => expect(getByTestId('select-book-0')).toBeTruthy());
    await act(async () => fireEvent.press(getByTestId('select-book-0')));
    expect(mockPost).toHaveBeenCalledWith('/wishlist', expect.objectContaining({ title: 'Dune' }));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('alerts on save error', async () => {
    mockGet.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });
    mockPost.mockRejectedValue(new Error('save failed'));
    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Text search mode'));
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    await act(async () => fireEvent.press(getByLabelText('Search for book')));
    await waitFor(() => expect(getByTestId('select-book-0')).toBeTruthy());
    await act(async () => fireEvent.press(getByTestId('select-book-0')));
    expect(Alert.alert).toHaveBeenCalled();
  });
});

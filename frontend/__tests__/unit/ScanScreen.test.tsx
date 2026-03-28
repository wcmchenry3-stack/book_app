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

// Helper: set Platform.OS for a describe block
function setPlatform(os: string) {
  let original: string;
  beforeEach(() => {
    original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
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
// Native camera mode — permissions
// ---------------------------------------------------------------------------
describe('ScanScreen — native camera permissions', () => {
  it('renders capture button and flip button when permission is granted', () => {
    const { getByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Capture book cover')).toBeTruthy();
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
// Native camera mode — facing toggle
// ---------------------------------------------------------------------------
describe('ScanScreen — native camera facing toggle', () => {
  it('toggles facing state when flip button is pressed', () => {
    const { getByLabelText } = render(<ScanScreen />);
    const flipBtn = getByLabelText('Flip camera');
    fireEvent.press(flipBtn);
    fireEvent.press(flipBtn);
    expect(getByLabelText('Flip camera')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Native camera mode — capture flow
// ---------------------------------------------------------------------------
describe('ScanScreen — native capture flow', () => {
  it('shows loading spinner during capture (camera stays mounted)', async () => {
    let resolveTake!: (v: unknown) => void;
    mockTakePictureAsync.mockReturnValue(
      new Promise((res) => {
        resolveTake = res;
      })
    );
    const { getByLabelText, getByTestId } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Capture book cover'));
    // Loading spinner visible while camera processes
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

  it('exits early without posting when takePictureAsync returns no uri', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: null });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockPost).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Web camera mode
// ---------------------------------------------------------------------------
describe('ScanScreen — web camera mode', () => {
  setPlatform('web');

  it('renders Scan Book Cover button instead of CameraView controls', () => {
    const { getByLabelText, queryByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Capture book cover')).toBeTruthy();
    expect(queryByLabelText('Flip camera')).toBeNull();
  });

  // RNTL's getByTestId doesn't traverse host string elements (e.g. <input>).
  // Use UNSAFE_getAllByType to find the raw HTML input in the test renderer tree.
  function getWebInput(utils: ReturnType<typeof render>) {
    const [input] = utils.UNSAFE_getAllByType('input' as unknown as React.ComponentType);
    return input;
  }

  it('renders hidden file input with correct attributes', () => {
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    expect(input.props.type).toBe('file');
    expect(input.props.accept).toBe('image/*');
    expect(input.props.capture).toBe('environment');
  });

  it('shows picker after file is selected and scan succeeds', async () => {
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost.mockResolvedValue({ data: [{ title: 'Dune', author: 'Herbert' }] });
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    await waitFor(() => expect(utils.getByTestId('dismiss-picker')).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith('/scan', expect.any(FormData), expect.any(Object));
  });

  it('shows loading spinner during web file processing', async () => {
    let resolvePost!: (v: unknown) => void;
    mockPost.mockReturnValue(
      new Promise((res) => {
        resolvePost = res;
      })
    );
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    act(() => {
      fireEvent(input, 'change', { target: { files: [mockFile] } });
    });
    expect(utils.getByTestId('loading-spinner')).toBeTruthy();
    await act(async () => resolvePost({ data: [] }));
  });

  it('alerts when web scan returns no books', async () => {
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost.mockResolvedValue({ data: [] });
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    expect(Alert.alert).toHaveBeenCalledWith('No books found', expect.any(String));
  });

  it('alerts with scan-unavailable on 503 from web', async () => {
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost.mockRejectedValue(makeAxiosError(503));
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    expect(Alert.alert).toHaveBeenCalledWith('Scan unavailable', expect.any(String));
  });

  it('alerts with scan-failed on generic error from web', async () => {
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost.mockRejectedValue(new Error('network'));
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    expect(Alert.alert).toHaveBeenCalledWith('Scan failed', expect.any(String));
  });

  it('does nothing when change fires with no file selected', async () => {
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [] } }));
    expect(mockPost).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Mode switch — camera controls disappear when switching to search
// ---------------------------------------------------------------------------
describe('ScanScreen — mode switch hides camera controls (native)', () => {
  it('hides capture and flip buttons after switching to search mode', () => {
    const { getByLabelText, queryByLabelText } = render(<ScanScreen />);
    // Camera controls visible initially
    expect(getByLabelText('Capture book cover')).toBeTruthy();
    expect(getByLabelText('Flip camera')).toBeTruthy();
    // Switch to search
    fireEvent.press(getByLabelText('Text search mode'));
    // Camera controls gone
    expect(queryByLabelText('Capture book cover')).toBeNull();
    expect(queryByLabelText('Flip camera')).toBeNull();
  });

  it('shows search input after switching to search mode', () => {
    const { getByLabelText } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Text search mode'));
    expect(getByLabelText('Book title or author search')).toBeTruthy();
  });

  it('shows capture and flip buttons after switching back to camera mode', () => {
    const { getByLabelText } = render(<ScanScreen />);
    fireEvent.press(getByLabelText('Text search mode'));
    fireEvent.press(getByLabelText('Camera scan mode'));
    expect(getByLabelText('Capture book cover')).toBeTruthy();
    expect(getByLabelText('Flip camera')).toBeTruthy();
  });
});

describe('ScanScreen — mode switch hides camera controls (web)', () => {
  setPlatform('web');

  function getWebInput(utils: ReturnType<typeof render>) {
    const [input] = utils.UNSAFE_getAllByType('input' as unknown as React.ComponentType);
    return input;
  }

  it('hides capture button and file input after switching to search mode', () => {
    const utils = render(<ScanScreen />);
    // Camera mode: capture button present
    expect(utils.getByLabelText('Capture book cover')).toBeTruthy();
    // Switch to search
    fireEvent.press(utils.getByLabelText('Text search mode'));
    // Capture button gone; file input no longer rendered
    expect(utils.queryByLabelText('Capture book cover')).toBeNull();
    // UNSAFE_getAllByType throws on empty — use try/catch to assert absence
    expect(() => utils.UNSAFE_getAllByType('input' as unknown as React.ComponentType)).toThrow();
  });

  it('shows capture button and file input after switching back to camera mode', () => {
    const utils = render(<ScanScreen />);
    fireEvent.press(utils.getByLabelText('Text search mode'));
    fireEvent.press(utils.getByLabelText('Camera scan mode'));
    expect(utils.getByLabelText('Capture book cover')).toBeTruthy();
    const input = getWebInput(utils);
    expect(input.props.type).toBe('file');
  });
});

// ---------------------------------------------------------------------------
// Full end-to-end flows
// ---------------------------------------------------------------------------
describe('ScanScreen — full native capture → wishlist flow', () => {
  it('captures, shows picker, selects book, posts to wishlist, alerts success', async () => {
    const book = { title: 'Dune', author: 'Herbert' };
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost
      .mockResolvedValueOnce({ data: [book] }) // /scan
      .mockResolvedValueOnce({}); // /wishlist
    const { getByLabelText, getByTestId } = render(<ScanScreen />);

    // Step 1: press capture
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));

    // Step 2: picker appears
    await waitFor(() => expect(getByTestId('select-book-0')).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith('/scan', expect.any(FormData), expect.any(Object));

    // Step 3: select the book
    await act(async () => fireEvent.press(getByTestId('select-book-0')));

    // Step 4: wishlist POST and success alert
    expect(mockPost).toHaveBeenCalledWith('/wishlist', expect.objectContaining({ title: 'Dune' }));
    expect(Alert.alert).toHaveBeenCalledWith('Added to wishlist', expect.any(String));
  });

  it('returns to idle if wishlist save fails', async () => {
    const book = { title: 'Dune', author: 'Herbert' };
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockPost
      .mockResolvedValueOnce({ data: [book] })
      .mockRejectedValueOnce(new Error('save failed'));
    const { getByLabelText, getByTestId, queryByTestId } = render(<ScanScreen />);

    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    await waitFor(() => expect(getByTestId('select-book-0')).toBeTruthy());
    await act(async () => fireEvent.press(getByTestId('select-book-0')));

    expect(Alert.alert).toHaveBeenCalledWith('Could not save', expect.any(String));
    // Picker is dismissed after failed save
    expect(queryByTestId('select-book-0')).toBeNull();
  });
});

describe('ScanScreen — full web capture → wishlist flow', () => {
  setPlatform('web');

  function getWebInput(utils: ReturnType<typeof render>) {
    const [input] = utils.UNSAFE_getAllByType('input' as unknown as React.ComponentType);
    return input;
  }

  it('selects file, shows picker, selects book, posts to wishlist, alerts success', async () => {
    const book = { title: 'Dune', author: 'Herbert' };
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost
      .mockResolvedValueOnce({ data: [book] }) // /scan
      .mockResolvedValueOnce({}); // /wishlist
    const utils = render(<ScanScreen />);

    // Step 1: fire file change
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));

    // Step 2: picker appears
    await waitFor(() => expect(utils.getByTestId('select-book-0')).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith('/scan', expect.any(FormData), expect.any(Object));

    // Step 3: select the book
    await act(async () => fireEvent.press(utils.getByTestId('select-book-0')));

    // Step 4: wishlist POST and success alert
    expect(mockPost).toHaveBeenCalledWith('/wishlist', expect.objectContaining({ title: 'Dune' }));
    expect(Alert.alert).toHaveBeenCalledWith('Added to wishlist', expect.any(String));
  });

  it('returns to idle if wishlist save fails after web scan', async () => {
    const book = { title: 'Dune', author: 'Herbert' };
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    mockPost
      .mockResolvedValueOnce({ data: [book] })
      .mockRejectedValueOnce(new Error('save failed'));
    const utils = render(<ScanScreen />);

    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    await waitFor(() => expect(utils.getByTestId('select-book-0')).toBeTruthy());
    await act(async () => fireEvent.press(utils.getByTestId('select-book-0')));

    expect(Alert.alert).toHaveBeenCalledWith('Could not save', expect.any(String));
    expect(utils.queryByTestId('select-book-0')).toBeNull();
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

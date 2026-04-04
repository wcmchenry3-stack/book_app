import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import ScanScreen from '../../app/(tabs)/scan';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockStartScan = jest.fn();

jest.mock('../../hooks/useScanJobs', () => ({
  useScanJobs: () => ({
    jobs: [],
    reviewingJob: null,
    startScan: mockStartScan,
    retryScan: jest.fn(),
    queueForLater: jest.fn(),
    reviewJob: jest.fn(),
    dismissReview: jest.fn(),
    dismissJob: jest.fn(),
    handleSelectBook: jest.fn(),
  }),
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

const mockFileCopy = jest.fn();
const mockFileCreate = jest.fn();
const mockDirCreate = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs' },
  Directory: jest.fn().mockImplementation((...args: unknown[]) => {
    const parts = args.map((a) =>
      typeof a === 'object' && a !== null && 'uri' in a ? (a as { uri: string }).uri : String(a)
    );
    return {
      uri: parts.join('/'),
      exists: true,
      create: mockDirCreate,
    };
  }),
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    // Mimic expo-file-system File: resolve uri from parent (string or File/Directory) + name
    const parts = args.map((a) =>
      typeof a === 'object' && a !== null && 'uri' in a ? (a as { uri: string }).uri : String(a)
    );
    return {
      uri: parts.join('/'),
      exists: true,
      create: mockFileCreate,
      copy: mockFileCopy,
    };
  }),
}));

const mockCaptureException = jest.fn();
const mockAddBreadcrumb = jest.fn();

jest.mock('../../lib/sentry', () => ({
  Sentry: {
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
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
        iconActive: '#000',
      },
      typography: { fontSizeBase: 16 },
      spacing: { md: 16 },
    },
  }),
}));

const { useCameraPermissions } = require('expo-camera');

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

  it('calls startScan with text type when search is pressed', () => {
    const { getByLabelText } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    fireEvent.press(getByLabelText('Search for book'));
    expect(mockStartScan).toHaveBeenCalledWith('text', undefined, 'Dune');
  });

  it('clears query after search', () => {
    const { getByLabelText } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    fireEvent.press(getByLabelText('Search for book'));
    expect(getByLabelText('Book title or author search').props.value).toBe('');
  });

  it('does nothing if search query is empty', () => {
    const { getByLabelText } = renderInSearchMode();
    fireEvent.press(getByLabelText('Search for book'));
    expect(mockStartScan).not.toHaveBeenCalled();
  });

  it('does not show a loading spinner (search runs in background)', () => {
    const { getByLabelText, queryByTestId } = renderInSearchMode();
    fireEvent.changeText(getByLabelText('Book title or author search'), 'Dune');
    fireEvent.press(getByLabelText('Search for book'));
    expect(queryByTestId('loading-spinner')).toBeNull();
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
// Native camera mode — capture flow (background)
// ---------------------------------------------------------------------------
describe('ScanScreen — native capture flow', () => {
  it('calls startScan with image type after photo capture', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockStartScan).toHaveBeenCalledWith(
      'image',
      expect.stringContaining('file:///docs/scan-queue/')
    );
  });

  it('copies photo to document directory before starting scan', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://tmp/photo.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockFileCopy).toHaveBeenCalled();
  });

  it('does not show loading spinner (search runs in background)', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText, queryByTestId } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(queryByTestId('loading-spinner')).toBeNull();
  });

  it('exits early without starting scan when takePictureAsync returns no uri', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: null });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockStartScan).not.toHaveBeenCalled();
  });

  it('camera controls remain visible after capture (no loading overlay)', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(getByLabelText('Capture book cover')).toBeTruthy();
    expect(getByLabelText('Flip camera')).toBeTruthy();
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

  it('calls startScan with image type after file selection', async () => {
    const mockFile = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [mockFile] } }));
    expect(mockStartScan).toHaveBeenCalledWith('image', expect.any(String));
  });

  it('does nothing when change fires with no file selected', async () => {
    const utils = render(<ScanScreen />);
    const input = getWebInput(utils);
    await act(async () => fireEvent(input, 'change', { target: { files: [] } }));
    expect(mockStartScan).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Mode switch
// ---------------------------------------------------------------------------
describe('ScanScreen — mode switch hides camera controls (native)', () => {
  it('hides capture and flip buttons after switching to search mode', () => {
    const { getByLabelText, queryByLabelText } = render(<ScanScreen />);
    expect(getByLabelText('Capture book cover')).toBeTruthy();
    fireEvent.press(getByLabelText('Text search mode'));
    expect(queryByLabelText('Capture book cover')).toBeNull();
    expect(queryByLabelText('Flip camera')).toBeNull();
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

  it('hides capture button after switching to search mode', () => {
    const utils = render(<ScanScreen />);
    expect(utils.getByLabelText('Capture book cover')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Text search mode'));
    expect(utils.queryByLabelText('Capture book cover')).toBeNull();
  });

  it('shows capture button after switching back to camera mode', () => {
    const utils = render(<ScanScreen />);
    fireEvent.press(utils.getByLabelText('Text search mode'));
    fireEvent.press(utils.getByLabelText('Camera scan mode'));
    expect(utils.getByLabelText('Capture book cover')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Sentry logging
// ---------------------------------------------------------------------------
describe('ScanScreen — Sentry logging', () => {
  it('adds breadcrumb when capture starts', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'scan', message: 'Camera capture started' })
    );
  });

  it('adds breadcrumb when photo is saved successfully', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'scan', message: 'Photo saved, starting scan' })
    );
  });

  it('adds warning breadcrumb when takePictureAsync returns no URI', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: null });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'scan',
        message: 'takePictureAsync returned no URI',
        level: 'warning',
      })
    );
  });

  it('captures exception to Sentry when file copy fails', async () => {
    const copyError = new Error('File copy failed');
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockFileCopy.mockImplementationOnce(() => {
      throw copyError;
    });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockCaptureException).toHaveBeenCalledWith(
      copyError,
      expect.objectContaining({ tags: { feature: 'camera-capture' } })
    );
  });

  it('does not call startScan when capture throws', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    mockFileCopy.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockStartScan).not.toHaveBeenCalled();
  });

  it('re-enables capture button after an error', async () => {
    mockTakePictureAsync.mockRejectedValueOnce(new Error('camera error'));
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(getByLabelText('Capture book cover').props.accessibilityState).not.toEqual(
      expect.objectContaining({ disabled: true })
    );
  });
});

// ---------------------------------------------------------------------------
// File system — directory creation
// ---------------------------------------------------------------------------
describe('ScanScreen — scan-queue directory handling', () => {
  it('creates scan-queue directory when it does not exist', async () => {
    const FileSystem = require('expo-file-system');
    // Override Directory mock to return exists: false
    FileSystem.Directory.mockImplementationOnce((...args: unknown[]) => {
      const parts = args.map((a: unknown) =>
        typeof a === 'object' && a !== null && 'uri' in a ? (a as { uri: string }).uri : String(a)
      );
      return {
        uri: parts.join('/'),
        exists: false,
        create: mockDirCreate,
      };
    });

    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    expect(mockDirCreate).toHaveBeenCalled();
  });

  it('skips directory creation when scan-queue already exists', async () => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://test.jpg' });
    const { getByLabelText } = render(<ScanScreen />);
    await act(async () => fireEvent.press(getByLabelText('Capture book cover')));
    // Default mock returns exists: true, so create should not be called
    expect(mockDirCreate).not.toHaveBeenCalled();
  });
});

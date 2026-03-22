import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '../../app/(auth)/login';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLogin = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        text: '#111',
        primary: '#2563EB',
      },
      typography: {
        fontSizeXL: 24,
        fontWeightBold: '700',
      },
      spacing: { xl: 32 },
    },
  }),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

const mockPromptAsync = jest.fn();

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(),
}));

function setupGoogleAuth(opts: { request?: object | null; response?: object | null } = {}) {
  const { useIdTokenAuthRequest } = require('expo-auth-session/providers/google');
  // Use 'in' check so callers can explicitly pass null to simulate no request yet
  const requestValue = 'request' in opts ? opts.request : { clientId: 'test' };
  const responseValue = 'response' in opts ? opts.response : null;
  useIdTokenAuthRequest.mockReturnValue([requestValue, responseValue, mockPromptAsync]);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupGoogleAuth();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  it('renders the app title', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Bookshelf')).toBeTruthy();
  });

  it('renders Sign in button when request is ready', () => {
    const { getByLabelText } = render(<LoginScreen />);
    expect(getByLabelText('Sign in with Google')).toBeTruthy();
  });

  it('shows Sign in text when request is truthy', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('shows ActivityIndicator when request is not yet ready', () => {
    setupGoogleAuth({ request: null });
    const { queryByText, getByLabelText } = render(<LoginScreen />);
    // Button label is still present (for accessibility) but text content is a spinner
    expect(queryByText('Sign in with Google')).toBeNull();
    expect(getByLabelText('Sign in with Google')).toBeTruthy();
  });

  it('button is disabled when request is null', () => {
    setupGoogleAuth({ request: null });
    const { getByLabelText } = render(<LoginScreen />);
    const btn = getByLabelText('Sign in with Google');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
  });

  it('calls promptAsync when button pressed', () => {
    const { getByLabelText } = render(<LoginScreen />);
    fireEvent.press(getByLabelText('Sign in with Google'));
    expect(mockPromptAsync).toHaveBeenCalled();
  });

  it('calls login with id_token when Google response is success', async () => {
    setupGoogleAuth({
      response: { type: 'success', params: { id_token: 'google-id-token-abc' } },
    });
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('google-id-token-abc'));
  });

  it('does not call login when response type is not success', async () => {
    setupGoogleAuth({ response: { type: 'dismiss' } });
    render(<LoginScreen />);
    await waitFor(() => expect(mockLogin).not.toHaveBeenCalled());
  });

  it('does not call login when response is null', async () => {
    setupGoogleAuth({ response: null });
    render(<LoginScreen />);
    await waitFor(() => expect(mockLogin).not.toHaveBeenCalled());
  });
});

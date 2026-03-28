import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const { t } = useTranslation('auth');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      login(id_token).catch(console.error);
    }
  }, [response, login]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text
        style={{ color: theme.colors.text, fontSize: theme.typography.fontSizeXL }}
        accessibilityRole="header"
      >
        {t('appTitle')}
      </Text>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            marginTop: theme.spacing.xl,
            opacity: request ? 1 : 0.6,
          },
        ]}
        onPress={() => promptAsync()}
        disabled={!request}
        accessibilityLabel={t('signIn')}
        accessibilityRole="button"
        accessibilityHint={t('signInHint')}
      >
        {!request ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: theme.typography.fontWeightBold }}>
            {t('signIn')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 220,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation('tabs');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.iconActive,
        tabBarInactiveTintColor: theme.colors.iconInactive,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerShown: false, // root _layout.tsx handles header
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          title: t('scan'),
          tabBarAccessibilityLabel: t('scanA11y'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: t('wishlist'),
          tabBarAccessibilityLabel: t('wishlistA11y'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-books"
        options={{
          title: t('myBooks'),
          tabBarAccessibilityLabel: t('myBooksA11y'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarAccessibilityLabel: t('settingsA11y'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

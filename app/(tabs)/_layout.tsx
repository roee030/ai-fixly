import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../src/components/ui';
import { COLORS } from '../../src/constants';

export default function TabLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textTertiary,
          tabBarStyle: {
            backgroundColor: COLORS.backgroundLight,
            borderTopColor: COLORS.border,
            height: 80,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'בית',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'היסטוריה',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'פרופיל',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}

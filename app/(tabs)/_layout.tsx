import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{symbol}</Text>;
}

export default function TabsLayout() {
  // Android SDK 57 defaults edge-to-edge ON, so content extends behind the
  // system nav bar. Pull the bottom inset dynamically for both platforms
  // so labels + icons stay above the gesture pill / 3-button nav / iOS
  // home indicator regardless of device.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.burgundy,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.cream,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyBold,
          fontSize: 11,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon symbol="✨" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="love"
        options={{
          title: 'Us',
          tabBarIcon: ({ focused }) => <TabIcon symbol="💝" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

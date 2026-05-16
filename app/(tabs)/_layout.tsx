import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{symbol}</Text>;
}

export default function TabsLayout() {
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
          ...(Platform.OS === 'ios' ? { height: 88, paddingBottom: 28 } : {}),
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
          title: 'Love',
          tabBarIcon: ({ focused }) => <TabIcon symbol="💝" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

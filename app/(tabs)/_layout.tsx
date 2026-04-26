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
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
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
        name="todo"
        options={{
          title: 'Together',
          tabBarIcon: ({ focused }) => <TabIcon symbol="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🎲" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="love"
        options={{
          title: 'Love',
          tabBarIcon: ({ focused }) => <TabIcon symbol="💝" focused={focused} />,
        }}
      />
      {/* Hide old screens from tab bar */}
      <Tabs.Screen name="questions" options={{ href: null }} />
      <Tabs.Screen name="games" options={{ href: null }} />
    </Tabs>
  );
}

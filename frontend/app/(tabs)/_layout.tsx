import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#EC4899',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="mycourses"
        options={{
          title: 'My Learning',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#08080C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

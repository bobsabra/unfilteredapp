import { Tabs } from 'expo-router';
import { Brain, Settings, ListChecks, Lightbulb, User, Calendar } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#888',
      }}
      initialRouteName="index"
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Daily Clarity',
          tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="decisions"
        options={{
          title: 'Decisions',
          tabBarIcon: ({ color, size }) => <Lightbulb size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="priorities"
        options={{
          title: 'Priorities',
          tabBarIcon: ({ color, size }) => <ListChecks size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
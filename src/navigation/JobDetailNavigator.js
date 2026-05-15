import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';
import JobOverviewScreen from '../screens/JobOverviewScreen';
import InstructionsScreen from '../screens/InstructionsScreen';
import AttachmentsScreen from '../screens/AttachmentsScreen';
import NotesScreen from '../screens/NotesScreen';
import { Colors } from '../utils/colors';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? Colors.accent : Colors.gray}
    />
  );
}

function TabLabel({ label, focused }) {
  return (
    <Text style={[styles.label, focused && styles.labelActive]}>
      {label}
    </Text>
  );
}

export default function JobDetailNavigator({ route }) {
  const { jobId, job } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="Overview"
        component={JobOverviewScreen}
        initialParams={{ jobId, job }}
        options={{
          tabBarLabel: 'OVERVIEW',
          tabBarIcon: ({ focused }) => <TabIcon name="information-circle-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Instructions"
        component={InstructionsScreen}
        initialParams={{ jobId, job }}
        options={{
          tabBarLabel: 'INSTRUCTIONS',
          tabBarIcon: ({ focused }) => <TabIcon name="document-text-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Attachments"
        component={AttachmentsScreen}
        initialParams={{ jobId, job }}
        options={{
          tabBarLabel: 'ATTACHMENTS',
          tabBarIcon: ({ focused }) => <TabIcon name="attach-outline" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        initialParams={{ jobId, job }}
        options={{
          tabBarLabel: 'NOTES',
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubble-outline" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.gray,
  },
  labelActive: {
    color: Colors.accent,
  },
});

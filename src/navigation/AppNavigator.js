import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import JobsScreen from '../screens/JobsScreen';
import JobDetailNavigator from './JobDetailNavigator';
import CreateJobScreen from '../screens/CreateJobScreen';
import ImportJobsScreen from '../screens/ImportJobsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddTechnicianScreen from '../screens/AddTechnicianScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EditJobScreen from '../screens/EditJobScreen';
import CalendarScreen from '../screens/CalendarScreen';
import { Colors } from '../utils/colors';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="Jobs" component={JobsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailNavigator}
        options={({ route, navigation }) => ({
          title: 'Job Detail',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{ title: 'Create Job' }}
      />
      <Stack.Screen
        name="ImportJobs"
        component={ImportJobsScreen}
        options={{ title: 'Import Jobs (CSV)' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="AddTechnician"
        component={AddTechnicianScreen}
        options={{ title: 'Add Technician' }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditJob"
        component={EditJobScreen}
        options={{ title: 'Edit Job' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || loading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

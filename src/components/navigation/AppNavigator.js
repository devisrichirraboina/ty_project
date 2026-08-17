import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SplashScreen } from '../screens/SplashScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { ChildRegistrationScreen } from '../screens/ChildRegistrationScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { ChildDashboardScreen } from '../screens/ChildDashboardScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { QuestionnaireScreen } from '../screens/QuestionnaireScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="ChildRegistration" component={ChildRegistrationScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="ChildDashboard" component={ChildDashboardScreen} />
    <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ headerShown: true, title: 'AI Companion Buddy' }} />
    <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ headerShown: true, title: 'KidCare Stress Quiz' }} />
  </Stack.Navigator>
);
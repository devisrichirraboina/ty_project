import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { SplashScreen } from '../screens/SplashScreen';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { ChildRegistrationScreen } from '../screens/ChildRegistrationScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { ChildDashboardScreen } from '../screens/ChildDashboardScreen';
import { QuestionnaireScreen } from '../screens/QuestionnaireScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="ChildRegistration" component={ChildRegistrationScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ChildDashboard" component={ChildDashboardScreen} />
      <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />
    </Stack.Navigator>
  );
};
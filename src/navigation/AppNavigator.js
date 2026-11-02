import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { SplashScreen } from '../screens/SplashScreen';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { ChildRegistrationScreen } from '../screens/ChildRegistrationScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { ChildDashboardScreen } from '../screens/ChildDashboardScreen';
import { QuestionnaireScreen } from '../screens/QuestionnaireScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { StressBustersScreen } from '../screens/StressBustersScreen';
import { BreatheWithMeScreen } from '../screens/BreatheWithMeScreen';
import { CalmMemoryScreen } from '../screens/CalmMemoryScreen';
import { ColorCalmScreen } from '../screens/ColorCalmScreen';
import { BubbleBreakScreen } from '../screens/BubbleBreakScreen';
import { ZenGardenScreen } from '../screens/ZenGardenScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { FacialEmotionScreen } from '../screens/FacialEmotionScreen';

import { ParentDashboardScreen } from '../screens/ParentDashboardScreen';
import { CounselorDashboardScreen } from '../screens/CounselorDashboardScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { ParentAuthScreen, CounselorAuthScreen } from '../screens/RoleAuthScreen';
import { CounselorChatScreen } from '../screens/CounselorChatScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { flex: 1 },
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
      />

      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
      />

      <Stack.Screen
        name="ChildRegistration"
        component={ChildRegistrationScreen}
      />

      <Stack.Screen
        name="ParentAuth"
        component={ParentAuthScreen}
      />

      <Stack.Screen
        name="CounselorAuth"
        component={CounselorAuthScreen}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="OTP"
        component={OTPScreen}
      />

      <Stack.Screen
        name="ChildDashboard"
        component={ChildDashboardScreen}
      />

      <Stack.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
      />

      <Stack.Screen
        name="CounselorDashboard"
        component={CounselorDashboardScreen}
      />

      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />

      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
      />

      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
      />

      <Stack.Screen
        name="StressBusters"
        component={StressBustersScreen}
      />

      <Stack.Screen
        name="BreatheWithMe"
        component={BreatheWithMeScreen}
      />

      <Stack.Screen
        name="CalmMemory"
        component={CalmMemoryScreen}
      />

      <Stack.Screen
        name="ColorCalm"
        component={ColorCalmScreen}
      />

      <Stack.Screen
        name="BubbleBreak"
        component={BubbleBreakScreen}
      />

      <Stack.Screen
        name="ZenGarden"
        component={ZenGardenScreen}
      />

      <Stack.Screen
        name="Journal"
        component={JournalScreen}
      />

      <Stack.Screen
        name="CounselorChat"
        component={CounselorChatScreen}
      />

      <Stack.Screen
        name="FacialEmotion"
        component={FacialEmotionScreen}
      />
    </Stack.Navigator>
  );
};
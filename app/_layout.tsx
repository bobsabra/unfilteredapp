import { useEffect, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ProfileProvider } from '@/context/ProfileContext';
import { PrioritiesProvider } from '@/context/PrioritiesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '@/context/ProfileContext';

function InitialLayout() {
  const { profile } = useProfile();
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOtpValidity();
  }, []);

  const checkOtpValidity = async () => {
    try {
      const otpTimestamp = await AsyncStorage.getItem('otpVerificationTimestamp');
      if (!otpTimestamp) {
        setIsValid(false);
        setLoading(false);
        return;
      }

      const verificationDate = new Date(parseInt(otpTimestamp));
      const now = new Date();
      const daysDifference = (now.getTime() - verificationDate.getTime()) / (1000 * 60 * 60 * 24);

      setIsValid(daysDifference <= 30);
      setLoading(false);
    } catch (error) {
      console.error('Error checking OTP validity:', error);
      setIsValid(false);
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // If no profile exists or OTP is invalid, redirect to signup
  if (!profile || !isValid) {
    return <Redirect href="/auth/signup" />;
  }

  // If profile exists and OTP is valid, redirect to main app
  return <Redirect href="/(tabs)" />;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ProfileProvider>
      <PrioritiesProvider>
        <InitialLayout />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
          <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </PrioritiesProvider>
    </ProfileProvider>
  );
}
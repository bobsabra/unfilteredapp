import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useProfile } from '@/context/ProfileContext';
import Toast from 'react-native-root-toast';
import { Phone, ArrowRight, KeyRound } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useProfile();

  const requestOtp = async () => {
    if (!phoneNumber.trim()) {
      Toast.show('Please enter a valid phone number', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: '#ff4444',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show('OTP sent successfully!', {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          backgroundColor: '#4CAF50',
        });
        setStage('otp');
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      Toast.show(error.message || 'Failed to send OTP', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: '#ff4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Toast.show('Please enter the OTP', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: '#ff4444',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the OTP verification timestamp
        await AsyncStorage.setItem('otpVerificationTimestamp', data.otpVerificationTimestamp.toString());
        await updateProfile(data.userProfile);
        
        Toast.show('Successfully verified!', {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          backgroundColor: '#4CAF50',
        });
        router.replace('/(tabs)');
      } else {
        throw new Error(data.error || 'Failed to verify OTP');
      }
    } catch (error: any) {
      Toast.show(error.message || 'Failed to verify OTP', {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        backgroundColor: '#ff4444',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          {stage === 'phone'
            ? 'Enter your phone number to get started'
            : 'Enter the verification code sent to your phone'}
        </Text>

        {stage === 'phone' ? (
          <View style={styles.inputContainer}>
            <Phone color="#666" size={24} />
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!loading}
            />
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <KeyRound color="#666" size={24} />
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={stage === 'phone' ? requestOtp : verifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>
                {stage === 'phone' ? 'Send Code' : 'Verify'}
              </Text>
              <ArrowRight color="#fff" size={24} />
            </>
          )}
        </TouchableOpacity>

        {stage === 'otp' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStage('phone')}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Change Phone Number</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
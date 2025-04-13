import AsyncStorage from '@react-native-async-storage/async-storage';

export async function POST() {
  try {
    await AsyncStorage.multiRemove([
      'userProfile',
      'otpVerificationTimestamp',
      'priorities',
      'dailyHistory',
      'decisionHistory',
      'calendarEvents'
    ]);

    return new Response(JSON.stringify({ message: 'User data cleared successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to clear user data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
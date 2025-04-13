import { Twilio } from 'twilio';
import { Profile } from '@/types/profile';

const accountSid = process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID;
const authToken = process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.EXPO_PUBLIC_TWILIO_VERIFY_SERVICE_SID;

async function createUserProfile(phoneNumber: string): Promise<Profile> {
  return {
    id: Math.random().toString(36).substring(7),
    name: '',
    bio: '',
    email: '',
    location: '',
    phoneNumber,
    socialMedia: [],
    demographics: {
      dateOfBirth: new Date().toISOString(),
      gender: 'prefer-not-to-say',
      occupation: '',
      education: '',
      interests: [],
    },
    settings: {
      theme: 'dark',
      notifications: true,
      privacy: 'public',
    },
  };
}

export async function POST(request: Request) {
  try {
    // Validate Twilio configuration
    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new Error('Twilio configuration is missing');
    }

    // Validate that accountSid starts with "AC"
    if (!accountSid.startsWith('AC')) {
      throw new Error('Invalid Account SID format');
    }

    const { phoneNumber, otp } = await request.json();
    if (!phoneNumber || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Twilio client with proper credentials
    const client = new Twilio(accountSid, authToken);

    // Verify the OTP
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code: otp });

    if (verification.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create user profile and verification timestamp
    const userProfile = await createUserProfile(phoneNumber);
    const otpVerificationTimestamp = Date.now();

    return new Response(
      JSON.stringify({
        message: 'OTP verified successfully',
        userProfile,
        otpVerificationTimestamp,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to verify OTP',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
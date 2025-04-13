import { Twilio } from 'twilio';
const accountSid = process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID;
const authToken = process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.EXPO_PUBLIC_TWILIO_VERIFY_SERVICE_SID;


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

    const { phoneNumber } = await request.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Twilio client with proper credentials
    const client = new Twilio(accountSid, authToken);

    // Create verification request
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });

    return new Response(JSON.stringify({ message: 'OTP sent successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send OTP',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
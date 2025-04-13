export type SocialMedia = {
  platform: string;
  username: string;
};

export type Gender =
  | 'male'
  | 'female'
  | 'non-binary'
  | 'other'
  | 'prefer-not-to-say';

export type Profile = {
  id: string;
  name: string;
  bio: string;
  email: string;
  location: string;
  phoneNumber?: string; // Added phone number field
  socialMedia: SocialMedia[];
  demographics: {
    dateOfBirth: string;
    gender: Gender;
    occupation: string;
    education: string;
    interests: string[];
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    privacy: 'public' | 'private';
  };
  openai?: {
    assistantId?: string;
    threadId?: string;
  };
};

export type ProfileContextType = {
  profile: Profile | null;
  updateProfile: (profile: Profile) => Promise<void>;
  loading: boolean;
  error: string | null;
};
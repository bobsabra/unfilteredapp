import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, ProfileContextType } from '@/types/profile';
import OpenAIService from '@/services/openai';

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  updateProfile: async () => {},
  loading: false,
  error: null,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        
        // Check if we need to create OpenAI resources
        if (!parsedProfile.openai?.assistantId || !parsedProfile.openai?.threadId) {
          const openAIService = OpenAIService.getInstance();
          
          // Create assistant and thread if they don't exist
          const assistantId = await openAIService.createAssistant(parsedProfile);
          const threadId = await openAIService.createThread();
          
          parsedProfile.openai = {
            assistantId,
            threadId,
          };
          
          // Save the updated profile
          await AsyncStorage.setItem('userProfile', JSON.stringify(parsedProfile));
        }
        
        setProfile(parsedProfile);
      }
    } catch (error) {
      setError('Failed to load profile');
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (newProfile: Profile) => {
    try {
      setLoading(true);
      
      // If this is a new profile or assistant doesn't exist, create OpenAI resources
      if (!newProfile.openai?.assistantId || !newProfile.openai?.threadId) {
        const openAIService = OpenAIService.getInstance();
        const assistantId = await openAIService.createAssistant(newProfile);
        const threadId = await openAIService.createThread();
        
        newProfile.openai = {
          assistantId,
          threadId,
        };
      }
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      setProfile(newProfile);
      setError(null);
    } catch (error) {
      setError('Failed to save profile');
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, loading, error }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
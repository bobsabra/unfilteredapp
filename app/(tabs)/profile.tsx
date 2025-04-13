import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '@/context/ProfileContext';
import { Profile as ProfileType, SocialMedia, Gender } from '@/types/profile';
import {
  AtSign,
  Briefcase,
  Calendar,
  ChevronDown,
  GraduationCap,
  MapPin,
  Plus,
  Save,
  Trash2,
  User,
  Sparkles,
  ChartLine as LineChart,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';

const INTERESTS = [
  'Technology',
  'Art',
  'Music',
  'Sports',
  'Reading',
  'Travel',
  'Food',
  'Fashion',
  'Gaming',
  'Photography',
  'Fitness',
  'Nature',
  'Movies',
  'Science',
  'Writing',
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export default function Profile() {
  const { profile, updateProfile, loading } = useProfile();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  );
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [socialInsights, setSocialInsights] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileType>(
    () =>
      profile || {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        bio: '',
        email: '',
        location: '',
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
      }
  );

  const [newSocialMedia, setNewSocialMedia] = useState({
    platform: '',
    username: '',
  });

  const handleSave = async () => {
    setSaveStatus('saving');
    await updateProfile(formData);
    setSaveStatus('saved');

    // Reset back to idle after 2 seconds
    setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  };

  const generateBio = async () => {
    if (!formData.name || !formData.email) {
      alert('Please enter your name and email first');
      return;
    }

    setGeneratingBio(true);

    try {
      const apiKey = Constants.expoConfig?.extra?.openAIKey;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content:
                  "You are a professional bio writer. Create a concise, engaging professional bio based on the provided information. The bio should be 2-3 sentences long and highlight the person's professional identity and interests.",
              },
              {
                role: 'user',
                content: `Name: ${formData.name}\nEmail: ${formData.email}\n${
                  formData.occupation
                    ? `Occupation: ${formData.occupation}\n`
                    : ''
                }${
                  formData.education ? `Education: ${formData.education}\n` : ''
                }${
                  formData.location ? `Location: ${formData.location}\n` : ''
                }${
                  formData.demographics.interests.length > 0
                    ? `Interests: ${formData.demographics.interests.join(
                        ', '
                      )}\n`
                    : ''
                }`,
              },
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate bio');
      }

      const data = await response.json();
      const generatedBio = data.choices[0].message.content.trim();

      setFormData((prev) => ({
        ...prev,
        bio: generatedBio,
      }));
    } catch (error) {
      console.error('Error generating bio:', error);
      alert('Failed to generate bio. Please try again.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const generateSocialInsights = async () => {
    if (formData.socialMedia.length === 0) {
      alert('Please add at least one social media account first');
      return;
    }

    setGeneratingInsights(true);
    setSocialInsights(null);

    try {
      const apiKey = Constants.expoConfig?.extra?.openAIKey;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content:
                  "You are a social media analyst. Analyze the user's social media presence and provide insights about their online personality, content style, and engagement patterns.",
              },
              {
                role: 'user',
                content: `Please analyze these social media profiles:
${formData.socialMedia
  .map(
    (social) =>
      `Platform: ${social.platform}
Username: ${social.username}`
  )
  .join('\n\n')}

Provide insights based on the latest 5 posts/reels published by user about:
1. Overall online presence and personality
2. Character style 
3. Engagements received 
4. Audience type that is interacting
Don't request the user to do further research as this will be displayed to users in a mobile app.`,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      const insights = data.choices[0].message.content.trim();
      setSocialInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const addSocialMedia = () => {
    if (newSocialMedia.platform && newSocialMedia.username) {
      setFormData((prev) => ({
        ...prev,
        socialMedia: [...prev.socialMedia, newSocialMedia],
      }));
      setNewSocialMedia({ platform: '', username: '' });
      setSocialInsights(null); // Clear insights when social media list changes
    }
  };

  const removeSocialMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: prev.socialMedia.filter((_, i) => i !== index),
    }));
    setSocialInsights(null); // Clear insights when social media list changes
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        interests: prev.demographics.interests.includes(interest)
          ? prev.demographics.interests.filter((i) => i !== interest)
          : [...prev.demographics.interests, interest],
      },
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        demographics: {
          ...prev.demographics,
          dateOfBirth: selectedDate.toISOString(),
        },
      }));
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Profile</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <User size={20} color="#fff" />
              <Text style={styles.label}>Full Name</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter your full name"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <AtSign size={20} color="#fff" />
              <Text style={styles.label}>Email</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, email: text }))
              }
              placeholder="Enter your email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.bioHeader}>
              <Text style={styles.label}>Bio</Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateBio}
                disabled={generatingBio}
              >
                {generatingBio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Sparkles size={16} color="#fff" />
                    <Text style={styles.generateButtonText}>
                      Generate using AI
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, bio: text }))
              }
              placeholder="Tell us about yourself"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <MapPin size={20} color="#fff" />
              <Text style={styles.label}>Location</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, location: text }))
              }
              placeholder="City, Country"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateSocialInsights}
              disabled={generatingInsights || formData.socialMedia.length === 0}
            >
              {generatingInsights ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <LineChart size={16} color="#fff" />
                  <Text style={styles.generateButtonText}>
                    Generate Insights
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.socialMediaForm}>
            <TextInput
              style={[styles.input, styles.socialMediaInput]}
              value={newSocialMedia.platform}
              onChangeText={(text) =>
                setNewSocialMedia((prev) => ({ ...prev, platform: text }))
              }
              placeholder="Platform (e.g., Twitter, LinkedIn)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[styles.input, styles.socialMediaInput]}
              value={newSocialMedia.username}
              onChangeText={(text) =>
                setNewSocialMedia((prev) => ({ ...prev, username: text }))
              }
              placeholder="Username or URL"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={styles.addButton} onPress={addSocialMedia}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {formData.socialMedia.map((social: SocialMedia, index: number) => (
            <View key={index} style={styles.socialMediaItem}>
              <View style={styles.socialMediaInfo}>
                <Text style={styles.platformText}>{social.platform}</Text>
                <Text style={styles.usernameText}>{social.username}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSocialMedia(index)}
              >
                <Trash2 size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}

          {socialInsights && (
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>Social Media Insights</Text>
              <Text style={styles.insightsText}>{socialInsights}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographics</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Calendar size={20} color="#fff" />
              <Text style={styles.label}>Date of Birth</Text>
            </View>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(formData.demographics.dateOfBirth)} (
                {calculateAge(formData.demographics.dateOfBirth)} years old)
              </Text>
            </TouchableOpacity>

            {showDatePicker &&
              (Platform.OS === 'ios' ? (
                <Modal
                  transparent={true}
                  visible={showDatePicker}
                  animationType="slide"
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <DateTimePicker
                        value={new Date(formData.demographics.dateOfBirth)}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                      />
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={new Date(formData.demographics.dateOfBirth)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={[styles.input, styles.dropdownButton]}
              onPress={() => setShowGenderPicker(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {
                  GENDERS.find((g) => g.value === formData.demographics.gender)
                    ?.label
                }
              </Text>
              <ChevronDown size={20} color="#fff" />
            </TouchableOpacity>

            <Modal
              visible={showGenderPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowGenderPicker(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  {GENDERS.map((gender) => (
                    <TouchableOpacity
                      key={gender.value}
                      style={[
                        styles.genderOption,
                        formData.demographics.gender === gender.value &&
                          styles.genderOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          demographics: {
                            ...prev.demographics,
                            gender: gender.value,
                          },
                        }));
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          formData.demographics.gender === gender.value &&
                            styles.genderOptionTextSelected,
                        ]}
                      >
                        {gender.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowGenderPicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Briefcase size={20} color="#fff" />
              <Text style={styles.label}>Occupation</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.demographics.occupation}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  demographics: { ...prev.demographics, occupation: text },
                }))
              }
              placeholder="Your occupation"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <GraduationCap size={20} color="#fff" />
              <Text style={styles.label}>Education</Text>
            </View>
            <TextInput
              style={styles.input}
              value={formData.demographics.education}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  demographics: { ...prev.demographics, education: text },
                }))
              }
              placeholder="Your highest education"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interests</Text>
            <View style={styles.interestsContainer}>
              {INTERESTS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestTag,
                    formData.demographics.interests.includes(interest) &&
                      styles.interestTagSelected,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestText,
                      formData.demographics.interests.includes(interest) &&
                        styles.interestTextSelected,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (loading || saveStatus === 'saving') && styles.saveButtonDisabled,
              saveStatus === 'saved' && styles.saveButtonSuccess,
            ]}
            onPress={handleSave}
            disabled={loading || saveStatus === 'saving'}
          >
            <Save size={24} color={saveStatus === 'saved' ? '#fff' : '#000'} />
            <Text
              style={[
                styles.saveButtonText,
                saveStatus === 'saved' && styles.saveButtonTextSuccess,
              ]}
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Changes Saved!'
                : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  genderOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  genderOptionSelected: {
    backgroundColor: '#fff',
  },
  genderOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  genderOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  socialMediaForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  socialMediaInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#333',
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialMediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  socialMediaInfo: {
    flex: 1,
  },
  platformText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  usernameText: {
    color: '#fff',
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
  },
  insightsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  insightsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightsText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestTagSelected: {
    backgroundColor: '#fff',
  },
  interestText: {
    color: '#fff',
    fontSize: 14,
  },
  interestTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonTextSuccess: {
    color: '#fff',
  },
});

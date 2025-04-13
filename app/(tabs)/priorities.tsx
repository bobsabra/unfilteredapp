import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MoveVertical as MoreVertical, ChevronDown, ChevronUp, Brain, Briefcase, Heart, User, Wallet, Dumbbell, Church, CircleCheck as CheckCircle2, Archive, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { usePriorities } from '@/context/PrioritiesContext';
import { Priority, PriorityDomain } from '@/types/priorities';
import PriorityModal from '@/components/PriorityModal';
import { useProfile } from '@/context/ProfileContext';
import OpenAIService from '@/services/openai';

const DOMAIN_ICONS: Record<PriorityDomain, React.ReactNode> = {
  career: <Briefcase size={24} color="#4CAF50" />,
  relationships: <Heart size={24} color="#E91E63" />,
  personal: <User size={24} color="#2196F3" />,
  finance: <Wallet size={24} color="#FFC107" />,
  health: <Dumbbell size={24} color="#FF5722" />,
  spiritual: <Church size={24} color="#9C27B0" />,
};

export default function Priorities() {
  const { priorities, loading, error, addPriority, updatePriority, removePriority } =
    usePriorities();
  const { profile } = useProfile();
  const [showModal, setShowModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | PriorityDomain>('all');
  const [sort, setSort] = useState<'urgency' | 'domain'>('urgency');
  const [progressAssessment, setProgressAssessment] = useState<{
    assessment: string;
    achievements: string[];
    improvements: string[];
    recommendations: string[];
  } | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const generateProgressAssessment = async () => {
    if (!profile?.openai?.assistantId || !profile?.openai?.threadId) return;

    setLoadingAssessment(true);
    try {
      const openAIService = OpenAIService.getInstance();
      const newThreadId = await openAIService.createThread();
      
      const message = `Use tool assess_progress_and_suggest with the calendarEvents, decisions, and priorities stored in my system. I want this month performance review. Only use the tools defined. You must respond via tool_calls. Do not return plain text. Return in JSON format.`;

      await openAIService.addMessage(newThreadId, message);
      const response = await openAIService.runAssistant(
        profile.openai.assistantId,
        newThreadId,
        profile.id,
        'assess_progress_and_suggest'
      );

      if (response) {
  setProgressAssessment({
    assessment: response.assessment || '',
    achievements: Array.isArray(response.achievements) ? response.achievements : [],
    improvements: Array.isArray(response.improvements) ? response.improvements : [],
    recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
  });
}
    } catch (error) {
      console.error('Error generating progress assessment:', error);
    } finally {
      setLoadingAssessment(false);
    }
  };

  const filteredPriorities = priorities
    .filter((p) => filter === 'all' || p.domain === filter)
    .sort((a, b) => {
      if (sort === 'urgency') {
        return a.timeline.end.getTime() - b.timeline.end.getTime();
      }
      return a.domain.localeCompare(b.domain);
    });

  const calculateProgress = (priority: Priority) => {
    const total = priority.timeline.end.getTime() - priority.timeline.start.getTime();
    const elapsed = Date.now() - priority.timeline.start.getTime();
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  };

  const handleStatusChange = async (priority: Priority, status: Priority['status']) => {
    await updatePriority({ ...priority, status });
    setShowActionMenu(null);
  };

  const ActionMenu = ({ priority }: { priority: Priority }) => (
    <Modal
      visible={showActionMenu === priority.id}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowActionMenu(null)}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setShowActionMenu(null)}
      >
        <View style={styles.actionMenu}>
          <TouchableOpacity
            style={styles.actionMenuItem}
            onPress={() => {
              setSelectedPriority(priority);
              setShowModal(true);
              setShowActionMenu(null);
            }}
          >
            <Edit3 size={20} color="#fff" />
            <Text style={styles.actionMenuText}>Edit</Text>
          </TouchableOpacity>

          {priority.status === 'active' && (
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleStatusChange(priority, 'completed')}
            >
              <CheckCircle2 size={20} color="#4CAF50" />
              <Text style={styles.actionMenuText}>Mark Complete</Text>
            </TouchableOpacity>
          )}

          {priority.status === 'active' && (
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleStatusChange(priority, 'archived')}
            >
              <Archive size={20} color="#FFC107" />
              <Text style={styles.actionMenuText}>Archive</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
            onPress={() => {
              removePriority(priority.id);
              setShowActionMenu(null);
            }}
          >
            <Trash2 size={20} color="#ff4444" />
            <Text style={[styles.actionMenuText, styles.actionMenuTextDanger]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Priority Filter</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedPriority(null);
            setShowModal(true);
          }}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipSelected]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {Object.entries(DOMAIN_ICONS).map(([domain, icon]) => (
            <TouchableOpacity
              key={domain}
              style={[
                styles.filterChip,
                filter === domain && styles.filterChipSelected,
              ]}
              onPress={() => setFilter(domain as PriorityDomain)}
            >
              {icon}
              <Text
                style={[
                  styles.filterChipText,
                  filter === domain && styles.filterChipTextSelected,
                ]}
              >
                {domain.charAt(0).toUpperCase() + domain.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setSort(sort === 'urgency' ? 'domain' : 'urgency')}
      >
        <Text style={styles.sortButtonText}>
          Sort by: {sort.charAt(0).toUpperCase() + sort.slice(1)}
        </Text>
        {sort === 'urgency' ? (
          <ChevronDown size={20} color="#fff" />
        ) : (
          <ChevronUp size={20} color="#fff" />
        )}
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Progress Assessment Section */}
          <View style={styles.assessmentSection}>
            <View style={styles.assessmentHeader}>
              <Brain color="#fff" size={24} />
              <Text style={styles.assessmentTitle}>Progress Assessment</Text>
            </View>

            {loadingAssessment ? (
              <ActivityIndicator color="#fff" style={styles.assessmentLoader} />
            ) : progressAssessment ? (
              <View style={styles.assessmentContent}>
                <Text style={styles.assessmentText}>{progressAssessment.assessment}</Text>

                <View style={styles.assessmentSubSection}>
                  <Text style={styles.subSectionTitle}>Key Achievements</Text>
                  {progressAssessment?.achievements?.map((achievement, index) => (
                    <View key={index} style={styles.bulletPoint}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{achievement}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.assessmentSubSection}>
                  <Text style={styles.subSectionTitle}>Areas for Improvement</Text>
                  {progressAssessment?.improvements?.map((improvement, index) => (
                    <View key={index} style={styles.bulletPoint}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{improvement}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.assessmentSubSection}>
                  <Text style={styles.subSectionTitle}>Recommendations</Text>
                  {progressAssessment?.recommendations?.map((recommendation, index) => (
                    <View key={index} style={styles.bulletPoint}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{recommendation}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateProgressAssessment}
              >
                <Text style={styles.generateButtonText}>Generate Assessment</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredPriorities.map((priority) => (
            <View key={priority.id} style={styles.priorityCard}>
              <View style={styles.priorityHeader}>
                <View style={styles.priorityDomain}>
                  {DOMAIN_ICONS[priority.domain]}
                  <Text style={styles.priorityDomainText}>
                    {priority.domain.charAt(0).toUpperCase() + priority.domain.slice(1)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowActionMenu(priority.id)}
                  style={styles.moreButton}
                >
                  <MoreVertical size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.priorityTitle}>{priority.title}</Text>
              {priority.description && (
                <Text style={styles.priorityDescription}>
                  {priority.description}
                </Text>
              )}

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${calculateProgress(priority)}%` },
                  ]}
                />
                <Text style={styles.progressText}>
                  {calculateProgress(priority)}% Complete
                </Text>
              </View>

              <View style={styles.timelineContainer}>
                <Text style={styles.timelineText}>
                  {priority.timeline.start.toLocaleDateString()} -{' '}
                  {priority.timeline.end.toLocaleDateString()}
                </Text>
                {priority.status !== 'active' && (
                  <View
                    style={[
                      styles.statusBadge,
                      priority.status === 'completed'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgeArchived,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {priority.status.charAt(0).toUpperCase() +
                        priority.status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <ActionMenu priority={priority} />
            </View>
          ))}
        </ScrollView>
      )}

      <PriorityModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPriority(null);
        }}
        onSave={selectedPriority ? updatePriority : addPriority}
        initialValues={selectedPriority || undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#ff000020',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    textAlign: 'center',
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 8,
  },
  filterChipSelected: {
    backgroundColor: '#fff',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  sortButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityDomain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDomainText: {
    color: '#888',
    fontSize: 14,
  },
  moreButton: {
    padding: 8,
  },
  priorityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  timelineText: {
    color: '#666',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeCompleted: {
    backgroundColor: '#4CAF5020',
  },
  statusBadgeArchived: {
    backgroundColor: '#FFC10720',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 8,
    width: '80%',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionMenuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionMenuText: {
    color: '#fff',
    fontSize: 16,
  },
  actionMenuTextDanger: {
    color: '#ff4444',
  },
  assessmentSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  assessmentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  assessmentLoader: {
    marginVertical: 20,
  },
  assessmentContent: {
    gap: 16,
  },
  assessmentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  assessmentSubSection: {
    marginTop: 16,
  },
  subSectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletDot: {
    color: '#888',
    marginRight: 8,
    fontSize: 16,
  },
  bulletText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
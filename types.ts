
// types.ts

export type ModelType = 'flash-lite' | 'flash' | 'pro';

export interface Geolocation {
  latitude: number;
  longitude: number;
}

export interface AttachedFile {
  name: string;
  mimeType: string;
  base64?: string; // For media files
  textContent?: string; // For text files
}

export interface ChatMessageSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  isProcessing?: boolean;
  isError?: boolean;
  attachedFiles?: AttachedFile[];
  sources?: ChatMessageSource[];
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  progressText?: string;
  responseTo?: string;
  isThinking?: boolean;
  toolUse?: {
    name: string;
    args: any;
    isCalling?: boolean;
    result?: string;
  };
  followUpQuestions?: string[];
  isGeneratingFollowUps?: boolean;
  generatedDocument?: {
    fileName: string;
    dataUrl: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  systemInstruction: string;
}

export interface EmergencyResult {
  name: string;
  address: string;
}

export interface LiveConversationHandle {
  triggerCameraToggle: () => Promise<boolean>;
  triggerFrameCapture: () => boolean;
}

export type AiVoice = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
export type LiveMode = 'General' | 'First Aid Assistant' | 'Fitness Coach';

// This defines the type of event in the timeline
export type LiveTimelineEventType =
  | 'user_speech' // User's speech transcript
  | 'user_action' // User's non-speech action (capture image, attach file)
  | 'bot_speech' // Bot's speech transcript
  | 'tool_call' // AI decides to call a tool
  | 'system_message'; // System info like "Interrupted" or "Connecting"

export interface BaseLiveTimelineEvent {
  id: string;
  timestamp: number;
  type: LiveTimelineEventType;
}

export interface UserSpeechEvent extends BaseLiveTimelineEvent {
  type: 'user_speech';
  text: string;
}

export interface UserActionEvent extends BaseLiveTimelineEvent {
  type: 'user_action';
  description: string; // "Captured an image for analysis"
  imageUrl?: string; // data-url for the image
  fileName?: string; // name of the attached file
}

export interface BotSpeechEvent extends BaseLiveTimelineEvent {
  type: 'bot_speech';
  text: string;
  imageUrl?: string; // data-url for generated image
  document?: { fileName: string; dataUrl: string };
}

export interface ToolCallEvent extends BaseLiveTimelineEvent {
  type: 'tool_call';
  // @google/genai-fix: Make the `id` optional to match the type from `@google/genai`'s `FunctionCall`.
  call: { id?: string, name: string; args: any };
  status: 'pending' | 'success' | 'error';
  result?: any;
}

export interface SystemMessageEvent extends BaseLiveTimelineEvent {
  type: 'system_message';
  message: string;
}

export type LiveTimelineEvent =
  | UserSpeechEvent
  | UserActionEvent
  | BotSpeechEvent
  | ToolCallEvent
  | SystemMessageEvent;


export interface ClinicInfo {
  name: string;
  address: string;
  hours: string;
  services: string[];
  phone: string;
}

export interface SymptomCheckResult {
  possibleCauses: string;
  recommendations: string;
  disclaimer: string;
}

export interface KnowledgeDocument {
    id: string;
    name: string;
    size: number;
    createdAt: number;
}

export interface AnalyzedMetric {
    metric: string;
    value: string;
    unit: string;
    range: string;
    status: 'High' | 'Low' | 'Normal' | 'Abnormal' | 'Unavailable';
    explanation: string;
}

export interface HealthReportAnalysis {
    reportType?: string;
    summary: string;
    keyFindings: AnalyzedMetric[];
    detailedResults: AnalyzedMetric[];
    lifestyleTips?: string[];
}

export type NewsCategory = 'Alert' | 'Campaign' | 'News' | 'Tip';

export interface HealthHubArticle {
    category: NewsCategory;
    title: string;
    summary: string;
    source: string;
}

export interface HealthRecord {
    id: string;
    userId: string;
    title: string;
    analysis: HealthReportAnalysis;
    createdAt: number;
}

export interface MapSearchResult {
  summary: string;
  places: ChatMessageSource[];
}

export interface MedicationSchedule {
  id: string;
  medication: string;
  dosage: string;
  frequency: string; // e.g., "Daily", "Every 6 hours"
  times: string[]; // e.g., ["08:00", "20:00"]
  endsAt: number | null; // Timestamp for when the schedule ends
}

export interface UserProfile {
    name?: string;
    work?: string;
    interests?: string[];
    preferences?: string[];
    allergies?: string[];
    medicalConditions?: string[];
    medications?: string[];
    healthGoals?: string[];
    medicationSchedules?: MedicationSchedule[];
    emergencyContact?: {
      name: string;
      phone: string;
    };
    healthPoints?: number;
}

export interface Appointment {
  success: boolean;
  confirmationId?: string;
  message: string;
}

export interface AppointmentRecord {
  id: string;
  userId: string;
  specialty: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  confirmationId: string;
  timestamp: number;
}

export interface MealLog {
  id: string;
  userId: string;
  name: string;
  timestamp: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  analysis: string;
  healthScore?: number;
}

export type MoodType = 'Great' | 'Good' | 'Okay' | 'Low' | 'Stressed' | 'Anxious';

export interface MoodLog {
    id: string;
    userId: string;
    mood: MoodType;
    note: string;
    aiResponse: string;
    timestamp: number;
}

export interface SleepLog {
    id: string;
    userId: string;
    bedtime: string; // HH:MM
    waketime: string; // HH:MM
    durationHours: number;
    quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    notes?: string;
    aiAnalysis?: string;
    timestamp: number; // Date of the log
}

export interface DrugAnalysis {
    drugName: string;
    genericName: string;
    indication: string; // What it treats
    dosageInstruction: string;
    commonSideEffects: string[];
    warnings: string[];
    safetyCheck: {
        safe: boolean;
        warningMessage?: string; // Message if there's a conflict with user profile
    };
}

export interface QueueTicket {
    id: string;
    hospitalName: string;
    department: string;
    queueNumber: string;
    currentQueue: string;
    estimatedWaitMinutes: number;
}

export interface RewardItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: string;
    code?: string;
}

export interface WearableData {
    steps: number;
    heartRate: number;
    caloriesBurned: number;
    sleepScore: number; // 0-100
    lastSync: number;
    spo2: number; // New: Blood Oxygen
    sleepStages: {
        deep: number; // minutes
        light: number;
        rem: number;
        awake: number;
    };
}

export interface FamilyMember {
    id: string;
    name: string;
    relation: string; // Parent, Child, Spouse
    status: 'Normal' | 'Need Attention' | 'Emergency';
    lastCheckIn: number;
    sharedMetrics?: {
        steps: number;
        mood: string;
    };
}

export interface HealthInsight {
    type: 'Correlation' | 'Prediction' | 'Anomaly';
    title: string;
    description: string;
    confidence: 'High' | 'Medium' | 'Low';
    relatedMetrics: string[]; // e.g., ['Sleep', 'Mood']
    recommendation: string;
}

export interface SkinAnalysisResult {
    conditionName: string;
    probability: string;
    description: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
    recommendation: string;
    disclaimer: string;
}

export interface HospitalRecord {
    id: string;
    date: string;
    hospitalName: string;
    doctorName: string;
    diagnosis: string;
    treatment: string;
}

export interface Prescription {
    id: string;
    medication: string;
    dosage: string;
    quantity: number;
    instructions: string;
    status: 'Active' | 'Completed';
}

// --- Planning Types ---
export interface MealPlanDay {
    day: string; // "Monday", "Day 1"
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
    totalCalories: number;
}

export interface WorkoutPlanDay {
    day: string;
    activity: string;
    duration: string;
    intensity: 'Low' | 'Medium' | 'High';
    notes: string;
}

export interface HealthPlan {
    title: string;
    summary: string;
    type: 'Meal' | 'Workout';
    schedule: MealPlanDay[] | WorkoutPlanDay[];
    createdFor: string; // User Name
    generatedAt: number;
}

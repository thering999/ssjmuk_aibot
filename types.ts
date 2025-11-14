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

export interface LiveTranscript {
  user: string;
  bot: string;
  userImage?: string;
  attachmentName?: string;
  generatedImageUrl?: string;
  generatedDocument?: {
    fileName: string;
    dataUrl: string;
  };
  toolCalls?: any[];
}

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
    summary: string;
    keyFindings: AnalyzedMetric[];
    detailedResults: AnalyzedMetric[];
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
}
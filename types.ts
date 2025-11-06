// types.ts

export type ModelType = 'flash-lite' | 'flash' | 'pro';

export interface Geolocation {
  latitude: number;
  longitude: number;
}

export interface AttachedFile {
  name: string;
  mimeType: string;
  base64: string;
}

export interface ChatMessageSource {
  uri: string;
  title: string;
}

export interface ClinicInfo {
    name: string;
    address: string;
    hours: string;
    services: string[];
    phone: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  isProcessing?: boolean;
  isError?: boolean;
  responseTo?: string; // id of the user message this is a response to
  attachedFiles?: AttachedFile[];
  sources?: ChatMessageSource[];
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  progressText?: string;
  isThinking?: boolean;
  toolUse?: {
      name: string;
      args: any;
      isCalling?: boolean;
      result?: string;
  };
  followUpQuestions?: string[];
  isGeneratingFollowUps?: boolean;
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

export interface KnowledgeDocument {
    id: string;
    name: string;
    size: number;
    createdAt: number;
}

// --- Types for Health Report Analyzer ---

export interface AnalyzedMetric {
  metric: string;
  value: string;
  unit: string;
  range: string;
  status: 'Normal' | 'High' | 'Low' | 'Abnormal' | 'Unavailable';
  explanation: string;
}

export interface HealthReportAnalysis {
  summary: string;
  keyFindings: AnalyzedMetric[];
  detailedResults: AnalyzedMetric[];
}

// --- Types for Health Hub ---
export type NewsCategory = 'Alert' | 'Campaign' | 'News' | 'Tip';

export interface HealthHubArticle {
  category: NewsCategory;
  title: string;
  summary: string;
  source: string;
}

// --- Types for Health Dashboard ---
export interface HealthRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: number; // Timestamp
  analysis: HealthReportAnalysis;
}
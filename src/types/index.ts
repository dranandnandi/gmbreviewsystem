export type Role = 'admin' | 'receptionist';
export type ProfileType = string; // Now allows any custom profile type
export type SequenceMessageStatus = 'pending' | 'sent' | 'failed';
export type ReportType = 'smart_report' | 'trend_analysis' | 'longitivity_report';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SequenceMessage {
  id: string;
  profileId: string;
  patientName: string;
  whatsappNumber: string;
  scheduledDate: string;
  messageContent: string;
  status: SequenceMessageStatus;
  createdAt: string;
}

export interface SequenceTemplate {
  id: string;
  userId?: string;
  profileType: ProfileType;
  messageTemplate: string;
  language: string;
  sequenceDays: number;
  sequenceOrder: number;
  targetProfileType?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  clinicName?: string;
  clinicAddress?: string;
  gmbLink?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  googleSheetId?: string;
  googleAppsScriptUrl?: string;
  blueticksApiKey?: string;
  profileTypes?: string[];
  languages?: Languages;
  defaultLanguage?: string;
  enabledFeatures?: string[];
}

export interface CreativeCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface Creative {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  contentType: 'image' | 'video' | 'iframe' | 'link';
  content: string;
  thumbnailUrl: string | null;
  year: number;
  monthNumber: number;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  userId: string;
}

export interface LanguageContent {
  name: string;
  address: string;
}

export interface Languages {
  [key: string]: LanguageContent;
}

export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';
export type ReviewStatus = 'pending' | 'sent';

export interface Appointment {
  id: string;
  clinicId: string;
  doctorId?: string;
  doctorName: string;
  doctorContact: string;
  patientAddress: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  contactNumber: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  patientName: string;
  appointmentDate: string;
  contactNumber: string;
  treatment?: string;
  notes?: string;
  status: ReviewStatus;
  hasSequence: boolean;
  aiReviewText?: string;
  aiReviewFirstMessageSent?: boolean;
  language?: string; // ISO code, default 'en'
  localizedMessageBundle?: {
    language: string;
    flow: 'ai3' | 'simple1';
    messages: string[];
    model?: string;
    terms_kept?: string[];
    created_at?: string;
  } | null;
  localizedMessageBundleStatus?: 'prepared' | 'consumed';
  createdAt: string;
}

export interface ReviewRequestTemplate {
  id: string;
  userId?: string;
  name: string;
  templateType: 'ai_integrated' | 'simple_thank_you';
  messageTemplate: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRequest {
  id: string;
  userId: string;
  patientName: string;
  patientWhatsappNumber?: string;
  requestDate: string;
  reportType: ReportType;
  summaryLanguage?: string;
  status: ReportStatus;
  uploadedReportUrls?: string[];
  generatedReportUrl?: string;
  mergedReportUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  user: User | null;
  appointments: Appointment[];
  reviews: Review[];
  creatives: Creative[];
  categories: CreativeCategory[];
  reportRequests: ReportRequest[];
  reviewRequestTemplates: ReviewRequestTemplate[];
  
  // Loading states
  isLoadingAppointments: boolean;
  isLoadingReviews: boolean;
  isLoadingCreatives: boolean;
  isLoadingSequenceMessages: boolean;
  isLoadingReportRequests: boolean;
  isLoadingReviewRequestTemplates: boolean;
  fetchAppointments: () => Promise<void>;
  sequenceMessages: SequenceMessage[];
  sequenceTemplates: SequenceTemplate[];
  fetchCreatives: (year?: number, month?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addAppointment: (appointment: Appointment) => Promise<void>;
  setUser: (user: User | null) => void;
  fetchSequenceMessages: () => Promise<void>;
  fetchClinicSettings: (clinicId: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  fetchReviewRequestTemplates: () => Promise<void>;
  updateReviewAiReviewText: (reviewId: string, aiReviewText: string) => Promise<void>;
  updateReviewAiFirstMessageStatus: (reviewId: string, status: boolean) => Promise<void>;
  addReportRequest: (request: Omit<ReportRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  fetchReportRequests: () => Promise<void>;
  updateReportRequest: (id: string, updates: Partial<ReportRequest>) => Promise<void>;
  sendMessagesToSheet: (messages: SequenceMessage[]) => Promise<void>;
  queueReviewMessageForSheet: (review: Review, messageType: 'ai_first' | 'ai_second' | 'simple_thank_you' | 'gmb_link') => Promise<SequenceMessage>;
  prepareLocalizedReviewBundle: (review: Review, language: string, flow: 'ai3' | 'simple1') => Promise<string[]>;
  markLocalizedBundleConsumed: (reviewId: string) => Promise<void>;
}
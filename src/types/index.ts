export type Role = 'admin' | 'receptionist' | 'super_admin';
export type ProfileType = string; // Now allows any custom profile type
export type SequenceMessageStatus = 'pending' | 'sent' | 'failed';
export type ReportType = 'smart_report' | 'trend_analysis' | 'longitivity_report';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ReportWhatsAppSendStatus = 'pending' | 'sent' | 'failed';

export interface BusinessContext {
  businessType?: string;
  customerLabel?: string;
  appointmentLabel?: string;
  locationLabel?: string;
  serviceKeywords?: string;
  promptNotes?: string;
}

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
  clinicKeywords?: string; // JSON string array of keywords for review generation
  businessContext?: BusinessContext | null;
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

// Biometrics for clinical calculations (especially longevity reports)
export type SmokingStatus = 'never' | 'former' | 'current';
export type AlcoholConsumption = 'never' | 'occasional' | 'regular';

export interface PatientBiometrics {
  anthropometry?: {
    height_cm?: number;
    weight_kg?: number;
  };
  vital_signs?: {
    systolic_bp?: number;
    diastolic_bp?: number;
    pulse_rate?: number;
  };
  lifestyle?: {
    smoking_status?: SmokingStatus;
    smokeless_tobacco?: SmokingStatus;
    alcohol_consumption?: AlcoholConsumption;
  };
  medical_history?: {
    diabetes?: boolean;
    hypertension?: boolean;
    dyslipidemia?: boolean;
    thyroid_disorder?: boolean;
    heart_disease?: boolean;
    kidney_disease?: boolean;
  };
  family_history?: {
    diabetes?: boolean;
    heart_disease?: boolean;
    hypertension?: boolean;
    stroke?: boolean;
    cancer?: boolean;
  };
}

// Individual clinical indices calculated from lab values + biometrics
export interface CalculatedIndex {
  name: string;
  value: number | string;
  unit?: string;
  interpretation?: string;
  category: string;
  status?: 'optimal' | 'borderline' | 'elevated' | 'low' | 'high' | 'normal' | 'not_calculated';
  reference_range?: string;
}

// Composite health scores for longevity reports
export interface CompositeScore {
  name: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  interpretation: string;
  factors_used: string[];
  factors_missing: string[];
  recommendations?: string[];
}

export interface CalculatedIndices {
  individual_indices: CalculatedIndex[];
  not_calculated_indices?: CalculatedIndex[];
  composite_scores: CompositeScore[];
  biological_age_estimate?: {
    estimated_age: number;
    chronological_age: number;
    age_difference: number;
    interpretation: string;
  };
  longevity_score?: {
    score: number;
    percentile?: number;
    interpretation: string;
  };
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
  letterheadUrl?: string;
  generatedReportUrl?: string;
  mergedReportUrl?: string;
  whatsappSendStatus?: ReportWhatsAppSendStatus;
  whatsappSentAt?: string;
  whatsappSendError?: string;
  notes?: string;
  biometrics?: PatientBiometrics;
  calculatedIndices?: CalculatedIndices;
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
  deleteReview: (reviewId: string) => Promise<void>;
}

// New interfaces for clinic information management
export interface ClinicInformation {
  id: string;
  userId: string;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicWebsite?: string;
  gmbLink?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  businessHours?: Record<string, { open: string; close: string; isOpen: boolean }>;
  specializations?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceTheme {
  id: string;
  userId: string;
  themeName: string;
  themeDescription?: string;
  profileType: string;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceTemplateAI {
  id: string;
  userId: string;
  themeId?: string;
  messageTemplate: string;
  sequenceDays: number;
  sequenceOrder: number;
  profileType: string;
  language: string;
  tone?: string;
  maxWords?: number;
  placeholders?: Record<string, string>;
  isActive: boolean;
  generatedBy: 'ai' | 'manual' | 'imported';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateSequenceParams {
  theme: string;
  details: string;
  numMessages: number;
  language: string;
  profileType: string;
  clinicName: string;
  clinicPhone: string;
}

// Payment & Subscription Types
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentOrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type PaymentTransactionStatus = 'Success' | 'Failure' | 'Aborted' | 'Invalid';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled';

export interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number | null;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface SaasPlanFeature {
  id: string;
  planId: string;
  featureId: string;
  limits: Record<string, unknown>;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string | null;
  status: SubscriptionStatus;
  billingProvider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  enabledFeatureOverrides: string[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  ccavenueOrderId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentInitiateRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
  billing_name?: string;
  billing_email?: string;
  billing_tel?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  order_id?: string;
  ccavenue_order_id?: string;
  encrypted_data?: string;
  access_code?: string;
  payment_url?: string;
  amount?: number;
  currency?: string;
  plan_name?: string;
  error?: string;
}

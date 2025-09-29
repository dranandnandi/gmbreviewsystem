import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Appointment, Review, SequenceMessage, SequenceTemplate, Creative, CreativeCategory, ReportRequest, ReviewRequestTemplate } from '../types';
import { supabase, executeWithRetry } from '../services/supabaseClient';
import { defaultReviewRequestTemplates } from '../data/reviewRequestDefaults';
import { getRandomizedSequenceDays } from '../utils/dateUtils';
import { addDays, format } from 'date-fns';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STATIC_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for static data

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  duration: number;
}

interface CacheState {
  categories: CacheEntry<CreativeCategory[]> | null;
  sequenceTemplates: CacheEntry<SequenceTemplate[]> | null;
  reviewRequestTemplates: CacheEntry<ReviewRequestTemplate[]> | null;
}

interface Store {
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
  isLoadingAIGeneration: boolean;
  
  // Cache state
  cache: CacheState;
  
  // AI-generated templates
  aiGeneratedTemplates: SequenceTemplate[];
  
  // Lazy loading functions
  lazyLoadAppointments: () => Promise<void>;
  lazyLoadReviews: () => Promise<void>;
  lazyLoadCreatives: (year?: number, month?: number) => Promise<void>;
  lazyLoadSequenceMessages: () => Promise<void>;
  lazyLoadReportRequests: () => Promise<void>;
  
  // Cache management
  getCachedData: <T>(key: keyof CacheState) => T | null;
  setCachedData: <T>(key: keyof CacheState, data: T, duration?: number) => void;
  clearCache: () => void;
  
  fetchAppointments: () => Promise<void>;
  sequenceMessages: SequenceMessage[];
  sequenceTemplates: SequenceTemplate[];
  fetchCreatives: (year?: number, month?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addAppointment: (appointment: Appointment) => Promise<void>;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateUserFeatures: (userId: string, features: string[]) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  updateReviewStatus: (id: string, status: Review['status'], hasSequence?: boolean) => Promise<void>;
  updateReviewFields: (id: string, updates: Partial<Pick<Review, 'patientName' | 'appointmentDate' | 'contactNumber' | 'treatment' | 'notes'>>) => Promise<void>;
  updateAppointmentFields: (id: string, updates: Partial<Pick<Appointment, 'patientName' | 'appointmentDate' | 'appointmentTime' | 'contactNumber' | 'patientAddress' | 'notes' | 'doctorId'>>) => Promise<void>;
  addSequenceMessage: (message: SequenceMessage) => Promise<void>;
  updateSequenceMessageStatus: (id: string, status: SequenceMessage['status']) => Promise<void>;
  deleteSequenceMessage: (id: string) => void;
  fetchSequenceTemplates: () => Promise<void>;
  fetchReviews: () => Promise<void>;
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
  // Localized bundles
  prepareLocalizedReviewBundle: (review: Review, language: string, flow: 'ai3' | 'simple1') => Promise<void>;
  markLocalizedBundleConsumed: (reviewId: string) => Promise<void>;
  
  // Message editing
  updateSequenceMessageContent: (messageId: string, newContent: string) => Promise<void>;
  
  // AI sequence generation
  generateAISequenceTemplates: (theme: string, details: string, numMessages: number, language: string, profileType: string, isGlobal?: boolean, targetProfileType?: string) => Promise<void>;
  saveAIGeneratedTemplates: (templates: SequenceTemplate[]) => Promise<void>;
  clearAIGeneratedTemplates: () => void;
  addSequenceTemplate: (template: Omit<SequenceTemplate, 'id'>) => Promise<void>;
  queueReviewMessageForSheet: (review: Review, messageType: 'ai_first' | 'ai_second' | 'simple_thank_you' | 'gmb_link') => Promise<SequenceMessage>;
  createBulkSequenceMessages: (reviews: Review[], profileType: string, language: string) => Promise<void>;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      appointments: [],
      reviews: [],
      creatives: [],
      categories: [],
      reportRequests: [],
      reviewRequestTemplates: [],
      
      // Loading states
      isLoadingAppointments: false,
      isLoadingReviews: false,
      isLoadingCreatives: false,
      isLoadingSequenceMessages: false,
      isLoadingReportRequests: false,
      isLoadingReviewRequestTemplates: false,
      isLoadingAIGeneration: false,
      
      // Cache state
      cache: {
        categories: null,
        sequenceTemplates: null,
        reviewRequestTemplates: null,
      },
      
      // AI-generated templates
      aiGeneratedTemplates: [],
      
      // Cache management functions
      getCachedData: <T>(key: keyof CacheState): T | null => {
        const { cache } = get();
        const entry = cache[key] as CacheEntry<T> | null;
        
        if (!entry) return null;
        
        const now = Date.now();
        if (now - entry.timestamp > entry.duration) {
          // Cache expired, remove it
          set((state) => ({
            cache: {
              ...state.cache,
              [key]: null
            }
          }));
          return null;
        }
        
        return entry.data;
      },
      
      setCachedData: <T>(key: keyof CacheState, data: T, duration = CACHE_DURATION) => {
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              data,
              timestamp: Date.now(),
              duration
            }
          }
        }));
      },
      
      clearCache: () => {
        set({
          cache: {
            categories: null,
            sequenceTemplates: null,
            reviewRequestTemplates: null,
          }
        });
      },
      
      // Lazy loading functions
      lazyLoadAppointments: async () => {
        const { isLoadingAppointments, appointments } = get();
        if (isLoadingAppointments || appointments.length > 0) return;
        
        set({ isLoadingAppointments: true });
        try {
          await get().fetchAppointments();
        } finally {
          set({ isLoadingAppointments: false });
        }
      },
      
      lazyLoadReviews: async () => {
        const { isLoadingReviews, reviews } = get();
        if (isLoadingReviews || reviews.length > 0) return;
        
        set({ isLoadingReviews: true });
        try {
          await get().fetchReviews();
        } finally {
          set({ isLoadingReviews: false });
        }
      },
      
      lazyLoadCreatives: async (year?: number, month?: number) => {
        const { isLoadingCreatives } = get();
        if (isLoadingCreatives) return;
        
        set({ isLoadingCreatives: true });
        try {
          await get().fetchCreatives(year, month);
        } finally {
          set({ isLoadingCreatives: false });
        }
      },
      
      lazyLoadSequenceMessages: async () => {
        const { isLoadingSequenceMessages, sequenceMessages } = get();
        if (isLoadingSequenceMessages || sequenceMessages.length > 0) return;
        
        set({ isLoadingSequenceMessages: true });
        try {
          await get().fetchSequenceMessages();
        } finally {
          set({ isLoadingSequenceMessages: false });
        }
      },
      
      lazyLoadReportRequests: async () => {
        const { isLoadingReportRequests, reportRequests } = get();
        if (isLoadingReportRequests || reportRequests.length > 0) return;
        
        set({ isLoadingReportRequests: true });
        try {
          await get().fetchReportRequests();
        } finally {
          set({ isLoadingReportRequests: false });
        }
      },
      
      fetchAppointments: async () => {
        const { user } = get();
        if (!user?.id) return;
        try {
          const { data, error } = await executeWithRetry(() =>
            supabase
              .from('appointments')
              .select(`
                id,
                user_id,
                doctor_id,
                doctor_name,
                doctor_contact,
                patient_name,
                appointment_date,
                appointment_time,
                contact_number,
                patient_address,
                notes,
                status,
                created_at
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
          );
          if (error) throw error;
          
          const transformedAppointments = data.map((apt: any) => ({
            id: apt.id,
            clinicId: user.id,
            doctorId: apt.doctor_id || '',
            doctorName: apt.doctor_name || 'Not assigned',
            doctorContact: apt.doctor_contact || 'Not available',
            patientName: apt.patient_name,
            appointmentDate: apt.appointment_date,
            appointmentTime: apt.appointment_time,
            contactNumber: apt.contact_number,
            patientAddress: apt.patient_address,
            notes: apt.notes,
            status: apt.status,
            createdAt: apt.created_at
          }));
          
          set({ appointments: transformedAppointments });
        } catch (error) {
          console.error('Error fetching appointments:', error);
          
          // Don't throw the error, just log it and set empty array
          if (error?.message?.includes('Failed to fetch')) {
            console.warn('Network connectivity issues detected. Appointments will be loaded when connection is restored.');
            set({ appointments: [] });
          } else {
            throw error;
          }
        }
      },
      
      sequenceMessages: [],
      sequenceTemplates: [],
      
      fetchCreatives: async (year?: number, month?: number) => {
        const { user } = get();
        if (!user?.id) return;
        try {
          const { data, error } = await supabase
            .from('creatives')
            .select(`
              id,
              category_id,
              title,
              description,
              content_type,
              content,
              thumbnail_url,
              year,
              month_number,
              created_at
            `)
            .eq('user_id', user.id)
            .eq('year', year || new Date().getFullYear())
            .eq('month_number', month || new Date().getMonth() + 1)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          const transformedCreatives = data.map(creative => ({
            id: creative.id,
            categoryId: creative.category_id,
            title: creative.title,
            description: creative.description,
            contentType: creative.content_type,
            content: creative.content,
            thumbnailUrl: creative.thumbnail_url,
            year: creative.year,
            monthNumber: creative.month_number,
            createdAt: creative.created_at
          }));
          
          set({ creatives: transformedCreatives });
        } catch (error) {
          console.error('Error fetching creatives:', error);
          throw error;
        }
      },
      
      fetchCategories: async () => {
        // Check cache first
        const cachedCategories = get().getCachedData<CreativeCategory[]>('categories');
        if (cachedCategories) {
          set({ categories: cachedCategories });
          return;
        }
        
        try {
          const { data, error } = await supabase
            .from('creative_categories')
            .select('*')
            .order('name');
          
          if (error) throw error;
          
          set({ categories: data });
          get().setCachedData('categories', data, STATIC_CACHE_DURATION);
        } catch (error) {
          console.error('Error fetching categories:', error);
          throw error;
        }
      },
      
      addAppointment: async (appointment) => {
        const { user } = get();
        if (!user?.id) return;
        try {
          const { data, error } = await supabase
            .from('appointments')
            .insert([{
              user_id: user.id,
              doctor_id: appointment.doctorId,
              doctor_name: appointment.doctorName,
              doctor_contact: appointment.doctorContact,
              patient_name: appointment.patientName,
              appointment_date: appointment.appointmentDate,
              appointment_time: appointment.appointmentTime,
              contact_number: appointment.contactNumber,
              patient_address: appointment.patientAddress,
              notes: appointment.notes,
              status: appointment.status,
              created_at: appointment.createdAt
            }])
            .select()
            .single();
          if (error) throw error;
          // Transform the returned data to match our Appointment type
          const transformedAppointment = {
            id: data.id,
            clinicId: user.id,
            doctorId: data.doctor_id || '',
            doctorName: data.doctor_name || 'Not assigned',
            doctorContact: data.doctor_contact || 'Not available',
            patientName: data.patient_name,
            appointmentDate: data.appointment_date,
            appointmentTime: data.appointment_time,
            contactNumber: data.contact_number,
            patientAddress: data.patient_address,
            notes: data.notes,
            status: data.status,
            createdAt: data.created_at
          };

          set((state) => ({
            appointments: [transformedAppointment, ...state.appointments]
          }));
        } catch (error) {
          console.error('Error adding appointment:', error);
          throw error;
        }
      },
      
      setUser: async (user) => {
        set({ user });
        
        // Only load essential static data immediately
        if (user?.id) {
          // Load static data that's needed across the app
          Promise.all([
            get().fetchCategories(),
            get().fetchSequenceTemplates(),
            get().fetchReviewRequestTemplates()
          ]).catch(console.error);
          
          // Other data will be loaded lazily when needed
        }
      },
      
      fetchReviews: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
          const { data, error } = await executeWithRetry(() =>
            supabase
              .from('reviews')
              .select(`
                id,
                user_id,
                patient_name,
                appointment_date,
                contact_number,
                treatment,
                notes,
                status,
                has_sequence,
                ai_review_text,
                ai_review_first_message_sent,
                language,
                localized_message_bundle,
                localized_message_bundle_status,
                created_at
              `)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
          );

          if (error) throw error;
          
          console.log('Raw data from Supabase:', data);
          
          // Transform the data to match our Review type
          const transformedReviews = data.map((review: any) => ({
            id: review.id,
            userId: review.user_id,
            patientName: review.patient_name || 'Unknown Patient',
            appointmentDate: review.appointment_date,
            contactNumber: review.contact_number,
            treatment: review.treatment,
            notes: review.notes,
            status: review.status as Review['status'],
            hasSequence: review.has_sequence || false,
            aiReviewText: review.ai_review_text,
            aiReviewFirstMessageSent: review.ai_review_first_message_sent || false,
            language: review.language || 'en',
            localizedMessageBundle: review.localized_message_bundle || null,
            localizedMessageBundleStatus: review.localized_message_bundle_status || undefined,
            createdAt: review.created_at
          })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          console.log('Transformed reviews:', transformedReviews);
          set({ reviews: transformedReviews });
        } catch (error) {
          console.error('Error fetching reviews:', error);
          
          // Don't throw the error, just log it and set empty array
          // This prevents the app from breaking when there are network issues
          if (error?.message?.includes('Failed to fetch')) {
            console.warn('Network connectivity issues detected. Reviews will be loaded when connection is restored.');
            set({ reviews: [] });
          } else {
            throw error;
          }
        }
      },
      
      login: async (username: string, password: string) => {
        try {
          // Sign in with Supabase auth
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: username,
            password: password,
          });

          if (authError) throw authError;

          // Get the user's data including clinic information
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              id,
              name,
              role,
              clinic_name,
              clinic_address,
              gmb_link,
              logo,
              primary_color,
              secondary_color,
              contact_phone,
              contact_email,
              contact_whatsapp,
              google_sheet_id,
              google_apps_script_url,
              blueticks_api_key,
              profile_types,
              languages,
              default_language,
              enabled_features
            `)
            .eq('auth_id', authData.user?.id)
            .single();

          if (userError) throw userError;

          const user = {
            id: userData.id,
            name: userData.name,
            role: userData.role,
            clinicName: userData.clinic_name,
            clinicAddress: userData.clinic_address,
            gmbLink: userData.gmb_link,
            logo: userData.logo,
            primaryColor: userData.primary_color,
            secondaryColor: userData.secondary_color,
            contactPhone: userData.contact_phone,
            contactEmail: userData.contact_email,
            contactWhatsapp: userData.contact_whatsapp,
            googleSheetId: userData.google_sheet_id,
            googleAppsScriptUrl: userData.google_apps_script_url,
            blueticksApiKey: userData.blueticks_api_key,
            profileTypes: userData.profile_types || [],
            languages: userData.languages,
            defaultLanguage: userData.default_language,
            enabledFeatures: userData.enabled_features || []
          };

          // Set user data including clinic information
          await get().setUser(user);
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      
      fetchReviewRequestTemplates: async () => {
        // Check cache first
        const cachedTemplates = get().getCachedData<ReviewRequestTemplate[]>('reviewRequestTemplates');
        if (cachedTemplates) {
          console.log('[TEMPLATES] Using cached templates:', cachedTemplates);
          set({ reviewRequestTemplates: cachedTemplates });
          return;
        }
        
        console.log('[TEMPLATES] Starting fetch from database...');
        set({ isLoadingReviewRequestTemplates: true });
        
        try {
          console.log('[TEMPLATES] Making Supabase query...');
          const { data, error } = await supabase
            .from('review_request_templates')
            .select(`
              id,
              user_id,
              name,
              template_type,
              message_template,
              description,
              created_at,
              updated_at
            `)
            .order('template_type', { ascending: true });

          if (error) throw error;
          
          console.log('[TEMPLATES] Raw data from Supabase:', data);
          
          const transformedTemplates = data.map((template: any) => ({
            id: template.id,
            userId: template.user_id,
            name: template.name,
            templateType: template.template_type,
            messageTemplate: template.message_template,
            description: template.description,
            createdAt: template.created_at,
            updatedAt: template.updated_at
          }));
          
          console.log('[TEMPLATES] Transformed templates:', transformedTemplates);
          
          // Ensure we have the required templates by adding defaults if missing
          const requiredTypes = ['ai_integrated', 'simple_thank_you'];
          const existingTypes = transformedTemplates.map(t => t.templateType);
          console.log('[TEMPLATES] Existing template types:', existingTypes);
          
          const missingTemplates = defaultReviewRequestTemplates.filter(
            defaultTemplate => !existingTypes.includes(defaultTemplate.templateType)
          );
          console.log('[TEMPLATES] Missing templates (will add defaults):', missingTemplates);
          
          const finalTemplates = [...transformedTemplates, ...missingTemplates];
          console.log('[TEMPLATES] Final templates after adding defaults:', finalTemplates);
          
          set({ reviewRequestTemplates: finalTemplates });
          get().setCachedData('reviewRequestTemplates', finalTemplates, STATIC_CACHE_DURATION);
        } catch (error) {
          console.error('Error fetching review request templates:', error);
          
          // If there's an error fetching from database, use default templates
          console.log('[TEMPLATES] Using fallback default templates due to error');
          set({ reviewRequestTemplates: defaultReviewRequestTemplates });
          get().setCachedData('reviewRequestTemplates', defaultReviewRequestTemplates, STATIC_CACHE_DURATION);
        } finally {
          console.log('[TEMPLATES] Finished loading templates, setting loading state to false');
          set({ isLoadingReviewRequestTemplates: false });
        }
      },
      
      updateReviewAiReviewText: async (reviewId: string, aiReviewText: string) => {
        try {
          const { error } = await supabase
            .from('reviews')
            .update({ ai_review_text: aiReviewText })
            .eq('id', reviewId);

          if (error) throw error;

          set((state) => ({
            reviews: state.reviews.map((review) =>
              review.id === reviewId ? { ...review, aiReviewText } : review
            ),
          }));
        } catch (error) {
          console.error('Error updating review AI text:', error);
          throw error;
        }
      },
      
      updateReviewAiFirstMessageStatus: async (reviewId: string, status: boolean) => {
        try {
          const { error } = await supabase
            .from('reviews')
            .update({ ai_review_first_message_sent: status })
            .eq('id', reviewId);

          if (error) throw error;

          set((state) => ({
            reviews: state.reviews.map((review) =>
              review.id === reviewId ? { ...review, aiReviewFirstMessageSent: status } : review
            ),
          }));
        } catch (error) {
          console.error('Error updating review AI first message status:', error);
          throw error;
        }
      },
      
      updateUser: async (updates: Partial<User>) => {
        const { user } = get();
        if (!user?.id) return;
        
        // Map frontend field names to database column names
        const dbUpdates = {
          clinic_name: updates.clinicName,
          clinic_address: updates.clinicAddress,
          gmb_link: updates.gmbLink,
          primary_color: updates.primaryColor,
          secondary_color: updates.secondaryColor,
          contact_phone: updates.contactPhone,
          contact_email: updates.contactEmail,
          contact_whatsapp: updates.contactWhatsapp,
          google_sheet_id: updates.googleSheetId,
          google_apps_script_url: updates.googleAppsScriptUrl,
          blueticks_api_key: updates.blueticksApiKey,
          enabled_features: updates.enabledFeatures
        };

        try {
          const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', user.id);

          if (error) throw error;

          set({ user: { ...user, ...updates } });
        } catch (error) {
          console.error('Error updating user:', error);
          throw error;
        }
      },
      
      updateUserFeatures: async (userId: string, features: string[]) => {
        try {
          const { error } = await supabase
            .from('users')
            .update({ enabled_features: features })
            .eq('id', userId);

          if (error) throw error;

          // Update current user if it's the same user
          const { user } = get();
          if (user?.id === userId) {
            set({ user: { ...user, enabledFeatures: features } });
          }
        } catch (error) {
          console.error('Error updating user features:', error);
          throw error;
        }
      },
      
      addReview: async (review) => {
        const { user } = get();
        if (!user?.id) return;

        try {
          const { data, error } = await supabase
            .from('reviews')
            .insert([{
              user_id: user.id,
              patient_name: review.patientName,
              appointment_date: review.appointmentDate,
              contact_number: review.contactNumber,
              treatment: review.treatment,
              notes: review.notes,
              status: review.status,
              ai_review_text: review.aiReviewText,
              ai_review_first_message_sent: review.aiReviewFirstMessageSent || false,
              created_at: review.createdAt
            }])
            .select()
            .single();

          if (error) throw error;

          // Transform the returned data to match our Review type
          const transformedReview = {
            id: data.id,
            userId: data.user_id,
            patientName: data.patient_name,
            appointmentDate: data.appointment_date,
            contactNumber: data.contact_number,
            treatment: data.treatment,
            notes: data.notes,
            status: data.status,
            hasSequence: data.has_sequence,
            aiReviewText: data.ai_review_text,
            aiReviewFirstMessageSent: data.ai_review_first_message_sent || false,
            createdAt: data.created_at
          };
          set((state) => ({
            reviews: [transformedReview, ...state.reviews]
          }));
        } catch (error) {
          console.error('Error adding review:', error);
          throw error;
        }
      },
      
      updateAppointmentStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            appointments: state.appointments.map((apt) =>
              apt.id === id ? { ...apt, status } : apt
            ),
          }));
        } catch (error) {
          console.error('Error updating appointment status:', error);
          throw error;
        }
      },
      
      updateReviewStatus: async (id: string, status: Review['status'], hasSequence?: boolean) => {
        try {
          const updates: { status: Review['status']; has_sequence?: boolean } = { status };
          if (typeof hasSequence === 'boolean') {
            updates.has_sequence = hasSequence;
          }

          console.log('Updating review status with:', { id, status, hasSequence, updates });
          const { error } = await supabase
            .from('reviews')
            .update(updates)
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            reviews: state.reviews.map((review) =>
              review.id === id ? { ...review, status, ...(hasSequence !== undefined && { hasSequence })} : review
            ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          }));
          
          const { reviews } = get();
          console.log('Updated reviews state:', reviews.find(r => r.id === id));
        } catch (error) {
          console.error('Error updating review status:', error);
          throw error;
        }
      },

      updateReviewFields: async (id, updates) => {
        try {
          // Map frontend field names to DB columns
            const dbUpdates: any = {};
            if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName;
            if (updates.appointmentDate !== undefined) dbUpdates.appointment_date = updates.appointmentDate;
            if (updates.contactNumber !== undefined) dbUpdates.contact_number = updates.contactNumber;
            if (updates.treatment !== undefined) dbUpdates.treatment = updates.treatment;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

            if (Object.keys(dbUpdates).length === 0) return; // nothing to update

            const { error } = await supabase
              .from('reviews')
              .update(dbUpdates)
              .eq('id', id);

            if (error) throw error;

            set((state) => ({
              reviews: state.reviews.map(r => r.id === id ? { ...r, ...updates } : r)
            }));
        } catch (error) {
          console.error('Error updating review fields:', error);
          throw error;
        }
      },

      updateAppointmentFields: async (id, updates) => {
        try {
          const dbUpdates: any = {};
          if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName;
          if (updates.appointmentDate !== undefined) dbUpdates.appointment_date = updates.appointmentDate;
          if (updates.appointmentTime !== undefined) dbUpdates.appointment_time = updates.appointmentTime;
          if (updates.contactNumber !== undefined) dbUpdates.contact_number = updates.contactNumber;
          if (updates.patientAddress !== undefined) dbUpdates.patient_address = updates.patientAddress;
          if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
          if (updates.doctorId !== undefined) {
            dbUpdates.doctor_id = updates.doctorId;
            // Also update denormalized doctor fields if available
            if (updates.doctorId) {
              const { data: doctorData, error: doctorError } = await supabase
                .from('doctors')
                .select('name, contact_number')
                .eq('id', updates.doctorId)
                .single();
              if (!doctorError && doctorData) {
                dbUpdates.doctor_name = doctorData.name;
                dbUpdates.doctor_contact = doctorData.contact_number;
              }
            } else {
              // If cleared
              dbUpdates.doctor_name = null;
              dbUpdates.doctor_contact = null;
            }
          }

          if (Object.keys(dbUpdates).length === 0) return;

          const { error } = await supabase
            .from('appointments')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            appointments: state.appointments.map(a => a.id === id ? { ...a, ...updates } : a)
          }));
        } catch (error) {
          console.error('Error updating appointment fields:', error);
          throw error;
        }
      },
      
      fetchSequenceTemplates: async () => {
        // Check cache first
        const cachedTemplates = get().getCachedData<SequenceTemplate[]>('sequenceTemplates');
        if (cachedTemplates) {
          set({ sequenceTemplates: cachedTemplates });
          return;
        }
        
        try {
          const { data, error } = await executeWithRetry(() =>
            supabase
              .from('sequence_templates')
              .select(`
                id,
                user_id,
                profile_type,
                message_template,
                language,
                sequence_days,
                sequence_order,
                target_profile_type
              `)
              .order('sequence_order', { ascending: true })
          );

          if (error) throw error;
          
          const transformedTemplates = data.map((template: any) => ({
            id: template.id,
            userId: template.user_id,
            profileType: template.profile_type,
            messageTemplate: template.message_template,
            language: template.language,
            sequenceDays: template.sequence_days,
            sequenceOrder: template.sequence_order,
            targetProfileType: template.target_profile_type
          }));
          
          set({ sequenceTemplates: transformedTemplates });
          get().setCachedData('sequenceTemplates', transformedTemplates, STATIC_CACHE_DURATION);
        } catch (error) {
          console.error('Error fetching sequence templates:', error);
          
          // Don't throw the error, just log it and set empty array
          if (error?.message?.includes('Failed to fetch')) {
            console.warn('Network connectivity issues detected. Sequence templates will be loaded when connection is restored.');
            set({ sequenceTemplates: [] });
          }
        }
      },
      
      fetchSequenceMessages: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
          const { data, error } = await executeWithRetry(() =>
            supabase
              .from('sequence_messages')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
          );

          if (error) throw error;
          
          const transformedMessages = data.map(message => ({
            id: message.id,
            profileId: message.profile_id,
            patientName: message.patient_name,
            whatsappNumber: message.whatsapp_number,
            scheduledDate: message.scheduled_date,
            messageContent: message.message_content,
            status: message.status,
            createdAt: message.created_at
          }));
          
          set({ sequenceMessages: transformedMessages });
        } catch (error) {
          console.error('Error fetching sequence messages:', error);
          
          // Don't throw the error, just log it and set empty array
          if (error?.message?.includes('Failed to fetch')) {
            console.warn('Network connectivity issues detected. Sequence messages will be loaded when connection is restored.');
            set({ sequenceMessages: [] });
          }
        }
      },
      
      fetchClinicSettings: async (clinicId: string) => {
        // This method appears to be unused but is required by the interface
        // Implement if needed for specific clinic settings fetching
        console.log('fetchClinicSettings called with clinicId:', clinicId);
      },
      
      addSequenceMessage: async (message) => {
        try {
          const { user } = get();
          if (!user?.id) throw new Error('User not authenticated');

          const { error } = await supabase
            .from('sequence_messages')
            .insert([{
              user_id: user.id,
              profile_id: message.profileId,
              patient_name: message.patientName,
              whatsapp_number: message.whatsappNumber,
              scheduled_date: message.scheduledDate,
              message_content: message.messageContent,
              status: message.status,
              created_at: message.createdAt
            }]);

          if (error) throw error;

          set((state) => ({
            sequenceMessages: [...state.sequenceMessages, message]
          }));
        } catch (error) {
          console.error('Error adding sequence message:', error);
          throw error;
        }
      },
      
      updateSequenceMessageStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('sequence_messages')
            .update({ status })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            sequenceMessages: state.sequenceMessages.map((m) =>
              m.id === id ? { ...m, status } : m
            ),
          }));
        } catch (error) {
          console.error('Error updating sequence message status:', error);
          throw error;
        }
      },
      
      deleteSequenceMessage: (id) =>
        set((state) => ({
          sequenceMessages: state.sequenceMessages.filter((m) => m.id !== id),
        })),
      
      addReportRequest: async (request) => {
        const { user } = get();
        if (!user?.id) return;

        try {
          const reportRequest = {
            id: crypto.randomUUID(),
            ...request,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('report_requests')
            .insert([{
              user_id: user.id,
              patient_name: request.patientName,
              patient_whatsapp_number: request.patientWhatsappNumber,
              request_date: request.requestDate,
              report_type: request.reportType,
              summary_language: request.summaryLanguage,
              status: 'pending',
              uploaded_report_urls: request.uploadedReportUrls,
              generated_report_url: request.generatedReportUrl,
              notes: request.notes,
              created_at: reportRequest.createdAt,
              updated_at: reportRequest.updatedAt
            }])
            .select()
            .single();

          if (error) throw error;

          // Transform the returned data to match our ReportRequest type
          const transformedRequest = {
            id: data.id,
            userId: data.user_id,
            patientName: data.patient_name,
            patientWhatsappNumber: data.patient_whatsapp_number,
            requestDate: data.request_date,
            reportType: data.report_type,
            summaryLanguage: data.summary_language,
            status: data.status,
            uploadedReportUrls: data.uploaded_report_urls,
            generatedReportUrl: data.generated_report_url,
            mergedReportUrl: data.merged_report_url,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };

          set((state) => ({
            reportRequests: [transformedRequest, ...state.reportRequests]
          }));
        } catch (error) {
          console.error('Error adding report request:', error);
          throw error;
        }
      },
      
      fetchReportRequests: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
          // Check if user is super admin to determine query scope
          const { data: userData, error: userError } = await executeWithRetry(() =>
            supabase
              .from('users')
              .select('role')
              .eq('id', user.id)
              .single()
          );

          if (userError) throw userError;

          const { data, error } = await executeWithRetry(() => {
            let query = supabase
              .from('report_requests')
              .select(`
                id,
                user_id,
                patient_name,
                patient_whatsapp_number,
                request_date,
                report_type,
                summary_language,
                status,
                uploaded_report_urls,
                generated_report_url,
                merged_report_url,
                notes,
                created_at,
                updated_at
              `)
              .order('created_at', { ascending: false });

            // If not super admin, filter by user_id
            if (userData.role !== 'super_admin') {
              query = query.eq('user_id', user.id);
            }

            return query;
          });
          if (error) throw error;

          // Transform the data to match our ReportRequest type
          const transformedRequests = data.map((request: any) => ({
            id: request.id,
            userId: request.user_id,
            patientName: request.patient_name,
            patientWhatsappNumber: request.patient_whatsapp_number,
            requestDate: request.request_date,
            reportType: request.report_type,
            summaryLanguage: request.summary_language,
            status: request.status,
            uploadedReportUrls: request.uploaded_report_urls,
            generatedReportUrl: request.generated_report_url,
            mergedReportUrl: request.merged_report_url,
            notes: request.notes,
            createdAt: request.created_at,
            updatedAt: request.updated_at
          }));

          set({ reportRequests: transformedRequests });
        } catch (error) {
          console.error('Error fetching report requests:', error);
          
          // Don't throw the error, just log it and set empty array
          // This prevents the app from breaking when there are network issues
          if (error?.message?.includes('Failed to fetch')) {
            console.warn('Network connectivity issues detected. Report requests will be loaded when connection is restored.');
            set({ reportRequests: [] });
          } else {
            throw error;
          }
        }
      },
      
      updateReportRequest: async (id, updates) => {
        try {
          // Map frontend field names to database column names
          const dbUpdates: any = {};
          
          if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName;
          if (updates.patientWhatsappNumber !== undefined) dbUpdates.patient_whatsapp_number = updates.patientWhatsappNumber;
          if (updates.reportType !== undefined) dbUpdates.report_type = updates.reportType;
          if (updates.summaryLanguage !== undefined) dbUpdates.summary_language = updates.summaryLanguage;
          if (updates.status !== undefined) dbUpdates.status = updates.status;
          if (updates.uploadedReportUrls !== undefined) dbUpdates.uploaded_report_urls = updates.uploadedReportUrls;
          if (updates.generatedReportUrl !== undefined) dbUpdates.generated_report_url = updates.generatedReportUrl;
          if (updates.mergedReportUrl !== undefined) dbUpdates.merged_report_url = updates.mergedReportUrl;
          if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
          
          // updated_at will be automatically updated by the trigger
          
          const { error } = await supabase
            .from('report_requests')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            reportRequests: state.reportRequests.map((request) =>
              request.id === id 
                ? { ...request, ...updates, updatedAt: new Date().toISOString() }
                : request
            ),
          }));
        } catch (error) {
          console.error('Error updating report request:', error);
          throw error;
        }
      },
      
      sendMessagesToSheet: async (messages: SequenceMessage[]) => {
        const { user } = get();
        if (!user?.googleSheetId || !user?.googleAppsScriptUrl) {
          throw new Error('Google Sheets configuration is missing. Please configure in Settings.');
        }

        if (messages.length === 0) {
          throw new Error('No messages to export.');
        }

        try {
          // Prepare payload for Google Apps Script
          const payload = {
            googleSheetId: user.googleSheetId,
            messages: messages.map(message => ({
              id: message.id,
              phoneNumber: message.whatsappNumber,
              messageContent: message.messageContent,
              patientName: message.patientName,
              scheduledDate: message.scheduledDate,
              status: 'Pending'
            }))
          };

          const response = await fetch(user.googleAppsScriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: JSON.stringify(payload),
            mode: 'cors'
          });

          if (!response.ok) {
            throw new Error(`Google Apps Script returned error: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to export messages');
          }

          // Update message statuses to 'sent_to_sheet' for successfully exported messages
          for (const message of messages) {
            await get().updateSequenceMessageStatus(message.id, 'sent');
          }

        } catch (error) {
          console.error('Error exporting to Google Sheet:', error);
          
          let errorMessage = 'Failed to export messages to Google Sheet. ';
          
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            errorMessage += 'Please check that your Google Apps Script URL is correct and the script is properly deployed.';
          } else if (error instanceof Error) {
            errorMessage += error.message;
          } else {
            errorMessage += 'Unknown error occurred.';
          }
          
          throw new Error(errorMessage);
        }
      },
      
      updateSequenceMessageContent: async (messageId: string, newContent: string) => {
        try {
          const { error } = await supabase
            .from('sequence_messages')
            .update({ message_content: newContent })
            .eq('id', messageId);

          if (error) throw error;

          set((state) => ({
            sequenceMessages: state.sequenceMessages.map((message) =>
              message.id === messageId ? { ...message, messageContent: newContent } : message
            ),
          }));
        } catch (error) {
          console.error('Error updating sequence message content:', error);
          throw error;
        }
      },

      // Prepare a localized (non-English) message bundle via edge function and persist it on the review
  prepareLocalizedReviewBundle: async (review: Review, language: string, flow: 'ai3' | 'simple1') => {
        const { user } = get();
        if (!user?.id) throw new Error('User not authenticated');
        try {
          const body = {
            language,
            flow,
            context: {
              patientName: review.patientName,
              clinicName: user.clinicName || '',
              clinicAddress: user.clinicAddress || '',
              gmbLink: user.gmbLink || '',
              date: new Date(review.appointmentDate).toLocaleDateString(),
              treatment: review.treatment || undefined,
              notes: review.notes || undefined,
              termsToKeep: [user.clinicName || '', 'MRI', 'CBC', 'X-ray', 'CT', 'ECG'].filter(Boolean)
            }
          };
          const { data, error } = await executeWithRetry(() =>
            supabase.functions.invoke('generate-review-bundle', { body })
          );
          if (error) throw error;

          // Persist on reviews
          const { error: upErr } = await executeWithRetry(() =>
            supabase
              .from('reviews')
              .update({
                language,
                localized_message_bundle: data,
                localized_message_bundle_status: 'prepared',
                ai_review_text: flow === 'ai3' && Array.isArray((data as any)?.messages) && (data as any).messages[1]
                  ? (data as any).messages[1]
                  : (review.aiReviewText || null),
                has_sequence: flow === 'ai3'
              })
              .eq('id', review.id)
              .select()
          );
          if (upErr) throw upErr;

          // Update local state
          set((state) => ({
            reviews: state.reviews.map(r => r.id === review.id ? {
              ...r,
              language,
              localizedMessageBundle: data as any,
              localizedMessageBundleStatus: 'prepared',
              aiReviewText: flow === 'ai3' && Array.isArray((data as any)?.messages) && (data as any).messages[1]
                ? (data as any).messages[1]
                : r.aiReviewText,
              hasSequence: flow === 'ai3'
            } : r)
          }));
        } catch (error) {
          console.error('Error preparing localized bundle:', error);
          throw error;
        }
      },

      // Mark the localized bundle as consumed after sending
      markLocalizedBundleConsumed: async (reviewId: string) => {
        try {
          const { error } = await executeWithRetry(() =>
            supabase
              .from('reviews')
              .update({ localized_message_bundle_status: 'consumed' })
              .eq('id', reviewId)
              .select()
          );
          if (error) throw error;
          set((state) => ({
            reviews: state.reviews.map(r => r.id === reviewId ? { ...r, localizedMessageBundleStatus: 'consumed' } : r)
          }));
        } catch (error) {
          console.error('Error marking bundle consumed:', error);
          throw error;
        }
      },
      
      generateAISequenceTemplates: async (theme: string, details: string, numMessages: number, language: string, profileType: string, isGlobal?: boolean, targetProfileType?: string) => {
        const { user } = get();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        set({ isLoadingAIGeneration: true });
        
        try {
          const { generateSequenceTemplatesAI } = await import('../services/aiService');
          
          const aiTemplates = await generateSequenceTemplatesAI({
            theme,
            details,
            numMessages,
            language,
            profileType,
            clinicName: user.clinicName || '',
            clinicPhone: user.contactPhone || ''
          });
          
          // Convert AI templates to full SequenceTemplate objects
          const fullTemplates: SequenceTemplate[] = aiTemplates.map(template => ({
            id: crypto.randomUUID(),
            userId: isGlobal ? undefined : user.id,
            profileType: profileType as any,
            messageTemplate: template.messageTemplate,
            language,
            sequenceDays: template.sequenceDays,
            sequenceOrder: template.sequenceOrder,
            targetProfileType: isGlobal && targetProfileType ? targetProfileType : undefined
          }));
          
          set({ aiGeneratedTemplates: fullTemplates });
        } catch (error) {
          console.error('Error generating AI sequence templates:', error);
          throw error;
        } finally {
          set({ isLoadingAIGeneration: false });
        }
      },
      
      saveAIGeneratedTemplates: async (templates: SequenceTemplate[]) => {
        const { user } = get();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        try {
          for (const template of templates) {
            await get().addSequenceTemplate({
              userId: template.userId,
              profileType: template.profileType,
              messageTemplate: template.messageTemplate,
              language: template.language,
              sequenceDays: template.sequenceDays,
              sequenceOrder: template.sequenceOrder,
              targetProfileType: template.targetProfileType
            });
          }
          
          // Clear AI generated templates after saving
          set({ aiGeneratedTemplates: [] });
          
          // Refresh sequence templates
          await get().fetchSequenceTemplates();
        } catch (error) {
          console.error('Error saving AI generated templates:', error);
          throw error;
        }
      },
      
      clearAIGeneratedTemplates: () => {
        set({ aiGeneratedTemplates: [] });
      },
      
      addSequenceTemplate: async (template: Omit<SequenceTemplate, 'id'>) => {
        const { user } = get();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        try {
          const { data, error } = await supabase
            .from('sequence_templates')
            .insert([{
              user_id: template.userId || user.id,
              profile_type: template.profileType,
              message_template: template.messageTemplate,
              language: template.language,
              sequence_days: template.sequenceDays,
              sequence_order: template.sequenceOrder,
              target_profile_type: template.targetProfileType
            }])
            .select()
            .single();

          if (error) throw error;

          const transformedTemplate = {
            id: data.id,
            userId: data.user_id,
            profileType: data.profile_type,
            messageTemplate: data.message_template,
            language: data.language,
            sequenceDays: data.sequence_days,
            sequenceOrder: data.sequence_order,
            targetProfileType: data.target_profile_type
          };

          set((state) => ({
            sequenceTemplates: [...state.sequenceTemplates, transformedTemplate]
          }));
        } catch (error) {
          console.error('Error adding sequence template:', error);
          throw error;
        }
      },
      
      queueReviewMessageForSheet: async (review: Review, messageType: 'ai_first' | 'ai_second' | 'simple_thank_you' | 'gmb_link') => {
        const { user, reviewRequestTemplates, addSequenceMessage, updateReviewAiReviewText, updateReviewAiFirstMessageStatus } = get();
        
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        let messageContent = '';
        
        try {
          switch (messageType) {
            case 'ai_first': {
              // Find the AI integrated template
              const template = reviewRequestTemplates.find(t => t.templateType === 'ai_integrated');
              if (!template) {
                throw new Error('AI review template not found. Please contact support.');
              }

              // Generate AI review if not already available
              if (!review.aiReviewText) {
                const { generateAIReview } = await import('../services/aiService');
                const aiReviewText = await generateAIReview({
                  clinicName: user.clinicName || '',
                  doctorName: user.name || '',
                  treatment: review.treatment || 'consultation',
                  date: new Date(review.appointmentDate).toLocaleDateString(),
                });
                
                // Save the AI review text to prevent future API calls
                await updateReviewAiReviewText(review.id, aiReviewText);
                review.aiReviewText = aiReviewText; // Update local copy
              }

              // Replace placeholders in the template
              messageContent = template.messageTemplate
                .replace(/{patient_name}/g, review.patientName)
                .replace(/{clinic_name}/g, user.clinicName || '')
                .replace(/{clinic_address}/g, user.clinicAddress || '')
                .replace(/{gmb_link}/g, user.gmbLink || '')
                .replace(/{contact_phone}/g, user.contactPhone || '')
                .replace(/{visit_date}/g, new Date(review.appointmentDate).toLocaleDateString())
                .replace(/{ai_review_text}/g, review.aiReviewText || '');
              
              break;
            }
            
            case 'ai_second': {
              if (!review.aiReviewText) {
                throw new Error('AI review text not available. Please try again.');
              }

              messageContent = `Here's your personalized review suggestion:

${review.aiReviewText}

Feel free to modify this review as needed before posting it on Google My Business.

Best regards,
Team ${user.clinicName || 'our clinic'}`;
              break;
            }
            
            case 'simple_thank_you': {
              // Find the simple thank you template
              const template = reviewRequestTemplates.find(t => t.templateType === 'simple_thank_you');
              if (!template) {
                throw new Error('Simple thank you template not found. Please contact support.');
              }

              // Replace placeholders in the template
              messageContent = template.messageTemplate
                .replace(/{patient_name}/g, review.patientName)
                .replace(/{clinic_name}/g, user.clinicName || '')
                .replace(/{clinic_address}/g, user.clinicAddress || '')
                .replace(/{gmb_link}/g, user.gmbLink || '')
                .replace(/{contact_phone}/g, user.contactPhone || '')
                .replace(/{visit_date}/g, new Date(review.appointmentDate).toLocaleDateString());
              
              break;
            }
            
            case 'gmb_link': {
              if (!user.gmbLink) {
                throw new Error('Google My Business link not configured. Please update in Settings.');
              }
              
              messageContent = `Hello ${review.patientName},

Thank you for visiting ${user.clinicName || 'our clinic'}. We would greatly appreciate your feedback.

You can submit your review here: ${user.gmbLink}

Best regards,
Team ${user.clinicName || 'our clinic'}`;
              break;
            }
            
            default:
              throw new Error('Invalid message type');
          }

          // Create sequence message
          const sequenceMessage: SequenceMessage = {
            id: crypto.randomUUID(),
            profileId: review.id,
            patientName: review.patientName,
            whatsappNumber: review.contactNumber,
            scheduledDate: new Date().toISOString().split('T')[0], // Today's date
            messageContent,
            status: 'pending',
            createdAt: messageType === 'ai_first' 
              ? new Date().toISOString() 
              : new Date(Date.now() + 1000).toISOString(), // Add 1 second delay for ai_second to ensure proper order
          };
          // Add to sequence messages
          await addSequenceMessage(sequenceMessage);
          
          // Update review status for AI first message
          if (messageType === 'ai_first') {
            await updateReviewAiFirstMessageStatus(review.id, true);
          }
          
          return sequenceMessage;
          
        } catch (error) {
          console.error('Error queuing review message:', error);
          throw error;
        }
      },

      createBulkSequenceMessages: async (reviews, profileType, language) => {
        const { user, sequenceTemplates, addSequenceMessage, updateReviewStatus } = get();
        
        if (!user?.clinicName || !user?.contactPhone) {
          throw new Error('Clinic information is missing. Please update clinic settings first.');
        }

        // Get templates for the selected profile type and language
        const selectedTemplates = sequenceTemplates.filter(t => 
          t.profileType === profileType && t.language === language
        );

        if (selectedTemplates.length === 0) {
          throw new Error(`No templates found for ${profileType} profile in ${language}. Please contact support.`);
        }

        let successCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const review of reviews) {
          try {
            // Skip if sequence already exists
            if (review.hasSequence) {
              console.log(`Sequence already exists for ${review.patientName}, skipping.`);
              skippedCount++;
              continue;
            }

            // Validate visit date
            const visitDate = new Date(review.appointmentDate);
            if (!visitDate || isNaN(visitDate.getTime())) {
              errors.push(`${review.patientName}: Invalid visit date`);
              continue;
            }

            let createdMessagesForReview = 0;

            // Create sequence messages for this review
            for (const template of selectedTemplates) {
              try {
                const randomizedDays = getRandomizedSequenceDays(template.sequenceDays);
                const scheduledDate = addDays(visitDate, randomizedDays);
                
                const messageContent = template.messageTemplate
                  .replace(/{patient_name}/g, review.patientName)
                  .replace(/{clinic_name}/g, user.clinicName)
                  .replace(/{clinic_phone}/g, user.contactPhone);

                const message = {
                  id: crypto.randomUUID(),
                  profileId: review.id,
                  patientName: review.patientName,
                  whatsappNumber: review.contactNumber,
                  scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
                  messageContent,
                  status: 'pending' as const,
                  createdAt: new Date().toISOString(),
                };

                await addSequenceMessage(message);
                createdMessagesForReview++;
              } catch (error) {
                console.error(`Error creating sequence message for ${review.patientName}:`, error);
                errors.push(`${review.patientName}: Failed to create message ${template.sequenceOrder}`);
              }
            }

            // Update review's has_sequence flag if messages were created
            if (createdMessagesForReview > 0) {
              await updateReviewStatus(review.id, review.status, true);
              successCount++;
            }

          } catch (error) {
            console.error(`Error processing review for ${review.patientName}:`, error);
            errors.push(`${review.patientName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Prepare result message
        let resultMessage = '';
        if (successCount > 0) {
          resultMessage += `Successfully created sequences for ${successCount} patient${successCount > 1 ? 's' : ''}`;
        }
        if (skippedCount > 0) {
          resultMessage += `${resultMessage ? '. ' : ''}Skipped ${skippedCount} patient${skippedCount > 1 ? 's' : ''} (sequences already exist)`;
        }
        if (errors.length > 0) {
          resultMessage += `${resultMessage ? '. ' : ''}Failed for ${errors.length} patient${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`;
        }

        if (errors.length > 0 && successCount === 0) {
          throw new Error(resultMessage);
        }

        // Set success message in the store or return it
        if (resultMessage) {
          console.log('Bulk sequence creation result:', resultMessage);
        }
      },
    }),
    {
      name: 'clinic-store',
      partialize: (state) => ({
        // Only persist cache and user data
        cache: state.cache,
        user: state.user
      }),
    }
  )
);
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../services/supabaseClient';
import { SequenceTheme, SequenceTemplateAI } from '../types';
import { generateSequenceTemplatesAI } from '../services/aiService';
import { Camera, Upload, Save, AlertCircle, Plus, Trash2, User, MapPin, Phone, Globe, Calendar, Users, Star, Award, Palette, BookOpen, Video, Building2, Stethoscope, ShieldCheck, Car, MessageSquare, Edit3, X, Check, FileText } from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Indigo + Slate', primary: '#4F46E5', secondary: '#334155' },
  { name: 'Blue + Sky', primary: '#2563EB', secondary: '#0EA5E9' },
  { name: 'Emerald + Teal', primary: '#10B981', secondary: '#14B8A6' },
  { name: 'Violet + Fuchsia', primary: '#7C3AED', secondary: '#D946EF' },
  { name: 'Rose + Amber', primary: '#F43F5E', secondary: '#F59E0B' },
  { name: 'Cyan + Gray', primary: '#06B6D4', secondary: '#6B7280' },
];

const SPECIALTIES = [
  'General Medicine', 'Gynecology', 'Orthopedics', 'Dental', 'ENT', 'Physiotherapy',
  'Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Psychiatry', 'Ophthalmology',
  'Urology', 'Oncology', 'Radiology', 'Anesthesiology', 'Emergency Medicine', 'Other'
];

const LANGUAGES = [
  'English', 'Hindi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 
  'Malayalam', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Other'
];

interface Doctor {
  name: string;
  qualification: string;
  specialty: string;
  experience: string;
  procedures: string;
  pastExperience: string;
  currentAffiliation: string;
  languages: string;
  photoUrl: string;
}

interface HealthPackage {
  name: string;
  included: string;
  duration: string;
  benefit: string;
}

// Mock upload service - you'll need to implement the actual service
const uploadMedia = async (files: File[], options: any): Promise<{ url: string }[]> => {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Return mock URLs - in real implementation this would upload to your server/cloud
  return files.map(file => ({ url: `https://example.com/uploads/${file.name}` }));
};

export default function ClinicInformationPage() {
  const { user } = useStore() as any;
  const [form, setForm] = useState({
    // 1. Basic Details
    clinicName: user?.clinicName || '',
    tagline: '',
    specialty: '',
    affiliations: '',
    languages: [] as string[],
    
    // 2. Contact & Online Presence
    mainPhone: user?.contactPhone || '',
    emergencyPhone: '',
    whatsappNumber: user?.contactWhatsapp || '',
    email: user?.contactEmail || '',
    website: '',
    gmbLink: user?.gmbLink || '',
    socialLinks: {
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: ''
    },
    
    // 3. Clinic Location
    clinicDisplayName: '',
    fullAddress: '',
    city: '',
    state: '',
    pincode: '',
    mapLink: '',
    timings: {
      morning: '',
      evening: '',
      sunday: ''
    },
    parkingDetails: '',
    
    // 4. Treatments/Services
    treatments: '',
    
    // 5. Health Packages
    healthPackages: [] as HealthPackage[],
    
    // 6. Doctor/Team Info
    doctors: [] as Doctor[],
    
    // 7. Clinic Description
    clinicMessage: '',
    
    // 8. Patient Education
    blogLink: '',
    youtubeChannel: '',
    articles: '',
    
    // 9. Images organized by type
    images: {
      exterior: [] as string[],
      reception: [] as string[],
      consultation: [] as string[],
      treatment: [] as string[],
      equipment: [] as string[],
      certificates: [] as string[]
    },
    
    // 10. Additional
    awards: '',
    memberships: '',
    specialFacilities: '',
    
    // Design & Branding
    logoUrl: user?.logo || '',
    colorPrimary: user?.primaryColor || COLOR_PRESETS[0].primary,
    colorSecondary: user?.secondaryColor || COLOR_PRESETS[0].secondary,
  });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [existingData, setExistingData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Theme and template state
  const [themes, setThemes] = useState<SequenceTheme[]>([]);
  const [templates, setTemplates] = useState<SequenceTemplateAI[]>([]);
  const [newTheme, setNewTheme] = useState({
    themeName: '',
    themeDescription: '',
    profileType: '',
    language: 'en'
  });
  const [generatingTemplates, setGeneratingTemplates] = useState(false);
  
  // Existing clinic information
  const [clinicInfo, setClinicInfo] = useState<any>(null);
  
  // Additional UI state
  const [activeTab, setActiveTab] = useState('info');
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<any>({});

  // Load existing clinic request data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // In a real implementation, you'd fetch from your database
        // const data = await fetchClinicRequest();
        // if (data) {
        //   setExistingData(data);
        //   populateFormFromData(data);
        // }
        console.log('Loading clinic data for user:', user.id);
      } catch (e) {
        console.warn('No existing clinic data found or failed to load:', e);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user?.id]);

  // Populate form with existing data
  const populateFormFromData = (data: any) => {
    setForm(prev => ({
      ...prev,
      // Basic Details
      clinicName: data.clinic_name || prev.clinicName,
      tagline: data.tagline || prev.tagline,
      specialty: data.specialty || prev.specialty,
      affiliations: data.affiliations || prev.affiliations,
      languages: Array.isArray(data.languages) ? data.languages : (Array.isArray(prev.languages) ? prev.languages : []),
      
      // Contact & Online Presence
      mainPhone: data.main_phone || prev.mainPhone,
      emergencyPhone: data.emergency_phone || prev.emergencyPhone,
      whatsappNumber: data.whatsapp_number || prev.whatsappNumber,
      email: data.contact_email || prev.email,
      website: data.website_url || prev.website,
      gmbLink: data.gmb_link || prev.gmbLink,
      socialLinks: (typeof data.social_links === 'object' && data.social_links !== null) ? data.social_links : prev.socialLinks,
      
      // Location
      clinicDisplayName: data.clinic_display_name || prev.clinicDisplayName,
      fullAddress: data.full_address || prev.fullAddress,
      city: data.city || prev.city,
      state: data.state || prev.state,
      pincode: data.pincode || prev.pincode,
      mapLink: data.map_link || prev.mapLink,
      timings: (typeof data.timings === 'object' && data.timings !== null) ? data.timings : prev.timings,
      parkingDetails: data.parking_details || prev.parkingDetails,
      
      // Services & Packages
      treatments: data.treatments || prev.treatments,
      healthPackages: Array.isArray(data.health_packages) ? data.health_packages : (Array.isArray(prev.healthPackages) ? prev.healthPackages : []),
      
      // Team & Doctors
      doctors: Array.isArray(data.doctors) ? data.doctors : (Array.isArray(prev.doctors) ? prev.doctors : []),
      
      // Content
      clinicMessage: data.clinic_message || prev.clinicMessage,
      blogLink: data.blog_link || prev.blogLink,
      youtubeChannel: data.youtube_channel || prev.youtubeChannel,
      articles: data.articles || prev.articles,
      
      // Media & Additional
      images: (typeof data.images === 'object' && data.images !== null) ? data.images : prev.images,
      awards: data.awards || prev.awards,
      memberships: data.memberships || prev.memberships,
      specialFacilities: data.special_facilities || prev.specialFacilities,
      
      // Design & Branding
      logoUrl: data.logo_url || prev.logoUrl,
      colorPrimary: data.color_primary || prev.colorPrimary,
      colorSecondary: data.color_secondary || prev.colorSecondary,
    }));
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const createTheme = async () => {
    if (!user?.id || !newTheme.themeName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('sequence_themes')
        .insert({
          user_id: user.id,
          theme_name: newTheme.themeName,
          theme_description: newTheme.themeDescription,
          profile_type: newTheme.profileType,
          language: newTheme.language
        })
        .select()
        .single();

      if (error) throw error;
      
      setThemes([data, ...themes]);
      setNewTheme({ themeName: '', themeDescription: '', profileType: '', language: 'en' });
    } catch (error) {
      console.error('Error creating theme:', error);
      alert('Failed to create theme. Please try again.');
    }
  };

  const generateTemplatesForTheme = async (theme: SequenceTheme) => {
    if (!user?.id || !clinicInfo) return;

    try {
      setGeneratingTemplates(true);
      const params = {
        theme: theme.themeName,
        details: theme.themeDescription || '',
        numMessages: 3,
        language: theme.language,
        profileType: theme.profileType,
        clinicName: clinicInfo.clinicName,
        clinicPhone: clinicInfo.clinicPhone || ''
      };

      const aiTemplates = await generateSequenceTemplatesAI(params);

      // Save to database
      const templatesData = aiTemplates.map((template: any) => ({
        user_id: user.id,
        theme_id: theme.id,
        message_template: template.messageTemplate,
        sequence_days: template.sequenceDays,
        sequence_order: template.sequenceOrder,
        profile_type: theme.profileType,
        language: theme.language,
        generated_by: 'ai' as const
      }));

      const { data, error } = await supabase
        .from('sequence_templates_ai')
        .insert(templatesData)
        .select();

      if (error) throw error;
      
      setTemplates([...templates, ...data]);
      alert(`Generated ${aiTemplates.length} templates for theme "${theme.themeName}"`);
    } catch (error) {
      console.error('Error generating templates:', error);
      alert('Failed to generate templates. Please try again.');
    } finally {
      setGeneratingTemplates(false);
    }
  };

  const saveForm = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const dataToSave = {
        user_id: user.id,
        clinic_name: form.clinicName,
        tagline: form.tagline,
        specialty: form.specialty,
        affiliations: form.affiliations,
        languages: form.languages,
        main_phone: form.mainPhone,
        emergency_phone: form.emergencyPhone,
        whatsapp_number: form.whatsappNumber,
        contact_email: form.email,
        website_url: form.website,
        gmb_link: form.gmbLink,
        social_links: form.socialLinks,
        clinic_display_name: form.clinicDisplayName,
        full_address: form.fullAddress,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        map_link: form.mapLink,
        timings: form.timings,
        parking_details: form.parkingDetails,
        treatments: form.treatments,
        health_packages: form.healthPackages,
        doctors: form.doctors,
        clinic_message: form.clinicMessage,
        blog_link: form.blogLink,
        youtube_channel: form.youtubeChannel,
        articles: form.articles,
        images: form.images,
        awards: form.awards,
        memberships: form.memberships,
        special_facilities: form.specialFacilities,
        logo_url: form.logoUrl,
        color_primary: form.colorPrimary,
        color_secondary: form.colorSecondary,
        updated_at: new Date().toISOString()
      };

      if (clinicInfo?.id) {
        const { data, error } = await supabase
          .from('clinic_information')
          .update(dataToSave)
          .eq('id', clinicInfo.id)
          .select()
          .single();

        if (error) throw error;
        setClinicInfo(data);
      } else {
        const { data, error } = await supabase
          .from('clinic_information')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setClinicInfo(data);
      }

      setSuccess('Clinic information saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving clinic information:', error);
      setError('Failed to save clinic information. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async (themeId: string) => {
    if (!window.confirm('Are you sure you want to delete this theme? This will also delete all associated templates.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sequence_themes')
        .delete()
        .eq('id', themeId);

      if (error) throw error;
      
      setThemes(themes.filter(t => t.id !== themeId));
      setTemplates(templates.filter(t => t.themeId !== themeId));
    } catch (error) {
      console.error('Error deleting theme:', error);
      alert('Failed to delete theme. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="h-8 w-8 mr-3 text-indigo-600" />
              Clinic Information Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your clinic details, sequence themes, and AI-generated templates
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'info', label: 'Clinic Info', icon: Building2 },
              { id: 'themes', label: 'Sequence Themes', icon: FileText },
              { id: 'templates', label: 'AI Templates', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Clinic Information Tab */}
      {activeTab === 'info' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Clinic Information</h2>
            {!editingInfo ? (
              <button
                onClick={() => setEditingInfo(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={saveForm}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingInfo(false);
                    setInfoForm(clinicInfo || {});
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Comprehensive 9-Section Form */}
          <div className="space-y-8">
            {/* 1. Basic Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Basic Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
                  <input
                    type="text"
                    name="clinicName"
                    value={form.clinicName}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    name="tagline"
                    value={form.tagline}
                    onChange={onChange}
                    disabled={!editingInfo}
                    placeholder="Your clinic's tagline"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Specialty</label>
                  <select
                    name="specialty"
                    value={form.specialty}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Specialty</option>
                    {SPECIALTIES.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affiliations</label>
                  <input
                    type="text"
                    name="affiliations"
                    value={form.affiliations}
                    onChange={onChange}
                    disabled={!editingInfo}
                    placeholder="Medical associations, hospitals"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 2. Contact & Online Presence */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Phone className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Contact & Online Presence</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Main Phone *</label>
                  <input
                    type="tel"
                    name="mainPhone"
                    value={form.mainPhone}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={form.emergencyPhone}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={form.whatsappNumber}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={form.website}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google My Business Link</label>
                  <input
                    type="url"
                    name="gmbLink"
                    value={form.gmbLink}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 3. Location */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <MapPin className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Clinic Location</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Address *</label>
                  <textarea
                    name="fullAddress"
                    value={form.fullAddress}
                    onChange={onChange}
                    disabled={!editingInfo}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
                  <input
                    type="url"
                    name="mapLink"
                    value={form.mapLink}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 4. Services & Packages */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Stethoscope className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Services & Packages</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treatments & Services</label>
                  <textarea
                    name="treatments"
                    value={form.treatments}
                    onChange={onChange}
                    disabled={!editingInfo}
                    rows={4}
                    placeholder="List your main treatments and services"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 5. Team & Doctors */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Users className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Team & Doctors</h3>
              </div>
              <div className="text-gray-600">
                <p>Doctor management functionality will be enhanced in future updates.</p>
              </div>
            </div>

            {/* 6. Content */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <BookOpen className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Content & Resources</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blog Link</label>
                  <input
                    type="url"
                    name="blogLink"
                    value={form.blogLink}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Channel</label>
                  <input
                    type="url"
                    name="youtubeChannel"
                    value={form.youtubeChannel}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Message</label>
                  <textarea
                    name="clinicMessage"
                    value={form.clinicMessage}
                    onChange={onChange}
                    disabled={!editingInfo}
                    rows={3}
                    placeholder="A message from your clinic to patients"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 7. Design & Branding */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Palette className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Design & Branding</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <input
                    type="color"
                    name="colorPrimary"
                    value={form.colorPrimary}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full h-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <input
                    type="color"
                    name="colorSecondary"
                    value={form.colorSecondary}
                    onChange={onChange}
                    disabled={!editingInfo}
                    className="w-full h-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Presets</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={!editingInfo}
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          colorPrimary: preset.primary,
                          colorSecondary: preset.secondary
                        }));
                      }}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex space-x-1">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      <div className="text-xs mt-1 text-gray-600">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Themes Tab */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          {/* Add New Theme */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Theme</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme Name *
                </label>
                <input
                  type="text"
                  value={newTheme.themeName}
                  onChange={(e) => setNewTheme({ ...newTheme, themeName: e.target.value })}
                  placeholder="e.g., Diabetes Care Follow-up"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Type *
                </label>
                <input
                  type="text"
                  value={newTheme.profileType}
                  onChange={(e) => setNewTheme({ ...newTheme, profileType: e.target.value })}
                  placeholder="e.g., Diabetes Patient"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTheme.themeDescription}
                  onChange={(e) => setNewTheme({ ...newTheme, themeDescription: e.target.value })}
                  placeholder="Describe the sequence theme and its purpose..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={newTheme.language}
                  onChange={(e) => setNewTheme({ ...newTheme, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="gu">Gujarati</option>
                  <option value="mr">Marathi</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={createTheme}
                  disabled={!newTheme.themeName.trim() || !newTheme.profileType.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Theme
                </button>
              </div>
            </div>
          </div>

          {/* Existing Themes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Existing Themes</h2>
            {themes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No themes created yet.</p>
            ) : (
              <div className="space-y-4">
                {themes.map(theme => (
                  <div key={theme.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{theme.themeName}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Profile: {theme.profileType} • Language: {theme.language}
                        </p>
                        {theme.themeDescription && (
                          <p className="text-sm text-gray-500 mt-2">{theme.themeDescription}</p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => generateTemplatesForTheme(theme)}
                          disabled={generatingTemplates}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {generatingTemplates ? 'Generating...' : 'Generate Templates'}
                        </button>
                        <button
                          onClick={() => deleteTheme(theme.id)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">AI Generated Templates</h2>
          {templates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No templates generated yet. Create themes and generate templates from the themes tab.
            </p>
          ) : (
            <div className="space-y-6">
              {templates.map(template => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Message {template.sequenceOrder} • Day {template.sequenceDays}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.profileType} • {template.language}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">Generated by AI</span>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {template.messageTemplate}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
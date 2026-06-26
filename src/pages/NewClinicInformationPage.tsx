import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { uploadMedia, UploadedFileInfo } from '../services/uploadService';
import { Upload, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Indigo + Slate', primary: '#4F46E5', secondary: '#334155' },
  { name: 'Blue + Sky', primary: '#2563EB', secondary: '#0EA5E9' },
  { name: 'Emerald + Teal', primary: '#10B981', secondary: '#14B8A6' },
  { name: 'Violet + Fuchsia', primary: '#7C3AED', secondary: '#D946EF' },
  { name: 'Rose + Amber', primary: '#F43F5E', secondary: '#F59E0B' },
  { name: 'Cyan + Gray', primary: '#06B6D4', secondary: '#6B7280' },
];

const SPECIALTIES = [
  'General Medicine', 'General Surgery', 'Gynecology', 'Orthopedics', 'Dental', 'ENT', 'Physiotherapy',
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

export default function ClinicInformationPage() {
  const { user, saveClinicRequest, fetchClinicRequest } = useStore() as any;
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

  // Load existing clinic request data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user?.id || !fetchClinicRequest) return;
      
      setLoading(true);
      try {
        const data = await fetchClinicRequest();
        if (data) {
          setExistingData(data);
          populateFormFromData(data);
        }
      } catch (e) {
        console.warn('No existing clinic data found or failed to load:', e);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user?.id, fetchClinicRequest]);

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

  const uploadToCategory = async (files: FileList | null, category: keyof typeof form.images) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadMedia(Array.from(files), { 
        userId: user?.id, 
        folder: `clinic/${category}` 
      });
      setForm(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [category]: [...prev.images[category], ...res.map((f: UploadedFileInfo) => f.url)]
        }
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      console.log('Uploading logo:', file.name, file.type, file.size);
      const res = await uploadMedia([file], { 
        userId: user?.id, 
        folder: 'clinic/branding' 
      });
      console.log('Upload response:', res);
      const logoUrl = res[0]?.url || '';
      if (logoUrl) {
        console.log('Setting logo URL:', logoUrl);
        setForm(prev => ({ ...prev, logoUrl }));
        setSuccess('Logo uploaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (e: any) {
      console.error('Logo upload error:', e);
      setError(e.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const uploadDoctorPhoto = async (file: File, doctorIndex: number) => {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadMedia([file], { 
        userId: user?.id, 
        folder: 'clinic/doctors' 
      });
      setForm(prev => ({
        ...prev,
        doctors: prev.doctors.map((doc, idx) => 
          idx === doctorIndex ? { ...doc, photoUrl: res[0]?.url || '' } : doc
        )
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to upload doctor photo');
    } finally {
      setUploading(false);
    }
  };

  const addDoctor = () => {
    setForm(prev => ({
      ...prev,
      doctors: [...prev.doctors, {
        name: '',
        qualification: '',
        specialty: '',
        experience: '',
        procedures: '',
        pastExperience: '',
        currentAffiliation: '',
        languages: '',
        photoUrl: ''
      }]
    }));
  };

  const updateDoctor = (idx: number, field: keyof Doctor, value: string) => {
    setForm(prev => ({
      ...prev,
      doctors: prev.doctors.map((doc, i) => i === idx ? { ...doc, [field]: value } : doc)
    }));
  };

  const removeDoctor = (idx: number) => {
    setForm(prev => ({
      ...prev,
      doctors: prev.doctors.filter((_, i) => i !== idx)
    }));
  };

  const addHealthPackage = () => {
    setForm(prev => ({
      ...prev,
      healthPackages: [...prev.healthPackages, { name: '', included: '', duration: '', benefit: '' }]
    }));
  };

  const updateHealthPackage = (idx: number, field: keyof HealthPackage, value: string) => {
    setForm(prev => ({
      ...prev,
      healthPackages: prev.healthPackages.map((pkg, i) => i === idx ? { ...pkg, [field]: value } : pkg)
    }));
  };

  const removeHealthPackage = (idx: number) => {
    setForm(prev => ({
      ...prev,
      healthPackages: prev.healthPackages.filter((_, i) => i !== idx)
    }));
  };

  const toggleLanguage = (lang: string) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
  };

  const selectPreset = (primary: string, secondary: string) => {
    setForm(prev => ({ ...prev, colorPrimary: primary, colorSecondary: secondary }));
  };

  const saveDraft = async (showMessage = true) => {
    setError(null);
    setSuccess(null);
    try {
      if (!user?.id) throw new Error('Not logged in');
      
      const payload = {
        // Map form data to database structure
        clinic_name: form.clinicName,
        tagline: form.tagline,
        specialty: form.specialty,
        affiliations: form.affiliations,
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
        languages: form.languages,
        logo_url: form.logoUrl,
        color_primary: form.colorPrimary,
        color_secondary: form.colorSecondary,
        is_draft: true
      };
      
      await saveClinicRequest?.(payload);
      if (showMessage) {
        setSuccess('Draft saved successfully! You can continue later.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save draft');
    }
  };

  const submitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (!user?.id) throw new Error('Not logged in');
      
      const payload = {
        clinic_name: form.clinicName,
        tagline: form.tagline,
        specialty: form.specialty,
        affiliations: form.affiliations,
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
        languages: form.languages,
        logo_url: form.logoUrl,
        color_primary: form.colorPrimary,
        color_secondary: form.colorSecondary,
        is_draft: false
      };
      
      await saveClinicRequest?.(payload);
      setSuccess('Clinic information submitted successfully!');
    } catch (e: any) {
      setError(e.message || 'Submission failed');
    }
  };

  const sections = [
    { id: 1, title: 'Basic Details', icon: '📝' },
    { id: 2, title: 'Contact & Online', icon: '📞' },
    { id: 3, title: 'Location & Timings', icon: '📍' },
    { id: 4, title: 'Services & Packages', icon: '🏥' },
    { id: 5, title: 'Team & Doctors', icon: '👨‍⚕️' },
    { id: 6, title: 'About & Education', icon: '📚' },
    { id: 7, title: 'Images & Media', icon: '📸' },
    { id: 8, title: 'Additional Info', icon: '⭐' },
    { id: 9, title: 'Design & Colors', icon: '🎨' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Clinic Information Form</h1>
        <p className="text-gray-600 mt-2">
          Share your clinic details for website creation. All fields are optional - save as draft and complete later!
        </p>
        {existingData && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              You have existing clinic information. Update any details and save to continue.
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading your clinic information...</span>
          </div>
        </div>
      )}

      {/* Form Content - only show after loading */}
      {!loading && (
        <>
          {/* Section Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.icon} {section.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submitFinal} className="space-y-8">
        {/* Section 1: Basic Details */}
        {activeSection === 1 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📝 Basic Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  name="clinicName"
                  value={form.clinicName}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={form.tagline}
                  onChange={onChange}
                  placeholder="Your clinic's tagline"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Specialty *
                </label>
                <select
                  name="specialty"
                  value={form.specialty}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select Specialty</option>
                  {SPECIALTIES.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Affiliations
                </label>
                <input
                  type="text"
                  name="affiliations"
                  value={form.affiliations}
                  onChange={onChange}
                  placeholder="Medical associations, hospitals"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Spoken
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {LANGUAGES.map(lang => (
                  <label key={lang} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Contact & Online Presence */}
        {activeSection === 2 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📞 Contact & Online Presence
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Phone *
                </label>
                <input
                  type="tel"
                  name="mainPhone"
                  value={form.mainPhone}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={form.whatsappNumber}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={onChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google My Business Link
                </label>
                <input
                  type="url"
                  name="gmbLink"
                  value={form.gmbLink}
                  onChange={onChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Social Media Links
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(form.socialLinks).map(([platform, url]) => (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {platform}
                    </label>
                    <input
                      type="url"
                      name={`socialLinks.${platform}`}
                      value={url}
                      onChange={onChange}
                      placeholder={`https://${platform}.com/...`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Location & Timings */}
        {activeSection === 3 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📍 Location & Timings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Display Name
                </label>
                <input
                  type="text"
                  name="clinicDisplayName"
                  value={form.clinicDisplayName}
                  onChange={onChange}
                  placeholder="How should your clinic appear on maps/directories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address *
                </label>
                <textarea
                  name="fullAddress"
                  value={form.fullAddress}
                  onChange={onChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={form.pincode}
                  onChange={onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  name="mapLink"
                  value={form.mapLink}
                  onChange={onChange}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinic Timings
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Morning Hours</label>
                  <input
                    type="text"
                    name="timings.morning"
                    value={form.timings.morning}
                    onChange={onChange}
                    placeholder="e.g. 9:00 AM - 1:00 PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Evening Hours</label>
                  <input
                    type="text"
                    name="timings.evening"
                    value={form.timings.evening}
                    onChange={onChange}
                    placeholder="e.g. 5:00 PM - 8:00 PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sunday Hours</label>
                  <input
                    type="text"
                    name="timings.sunday"
                    value={form.timings.sunday}
                    onChange={onChange}
                    placeholder="e.g. 10:00 AM - 2:00 PM or Closed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking Details
              </label>
              <textarea
                name="parkingDetails"
                value={form.parkingDetails}
                onChange={onChange}
                rows={2}
                placeholder="Describe parking availability, charges, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Section 4: Services & Packages */}
        {activeSection === 4 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🏥 Services & Packages
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatments & Services
              </label>
              <textarea
                name="treatments"
                value={form.treatments}
                onChange={onChange}
                rows={4}
                placeholder="List your main treatments and services"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Health Packages
                </label>
                <button
                  type="button"
                  onClick={addHealthPackage}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Package
                </button>
              </div>
              
              {form.healthPackages.map((pkg, idx) => (
                <div key={idx} className="border rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-800">Package {idx + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeHealthPackage(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Package Name"
                      value={pkg.name}
                      onChange={(e) => updateHealthPackage(idx, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Duration"
                      value={pkg.duration}
                      onChange={(e) => updateHealthPackage(idx, 'duration', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <textarea
                      placeholder="What's included"
                      value={pkg.included}
                      onChange={(e) => updateHealthPackage(idx, 'included', e.target.value)}
                      rows={2}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <textarea
                      placeholder="Benefits"
                      value={pkg.benefit}
                      onChange={(e) => updateHealthPackage(idx, 'benefit', e.target.value)}
                      rows={2}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Team & Doctors */}
        {activeSection === 5 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                👨‍⚕️ Team & Doctors
              </h2>
              <button
                type="button"
                onClick={addDoctor}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </button>
            </div>
            
            {form.doctors.map((doctor, idx) => (
              <div key={idx} className="border rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-medium text-gray-800">Doctor {idx + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeDoctor(idx)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Doctor Name"
                    value={doctor.name}
                    onChange={(e) => updateDoctor(idx, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Qualification"
                    value={doctor.qualification}
                    onChange={(e) => updateDoctor(idx, 'qualification', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Specialty"
                    value={doctor.specialty}
                    onChange={(e) => updateDoctor(idx, 'specialty', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Experience"
                    value={doctor.experience}
                    onChange={(e) => updateDoctor(idx, 'experience', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <textarea
                    placeholder="Procedures & Expertise"
                    value={doctor.procedures}
                    onChange={(e) => updateDoctor(idx, 'procedures', e.target.value)}
                    rows={2}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <textarea
                    placeholder="Past Experience"
                    value={doctor.pastExperience}
                    onChange={(e) => updateDoctor(idx, 'pastExperience', e.target.value)}
                    rows={2}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Current Affiliation"
                    value={doctor.currentAffiliation}
                    onChange={(e) => updateDoctor(idx, 'currentAffiliation', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Languages"
                    value={doctor.languages}
                    onChange={(e) => updateDoctor(idx, 'languages', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadDoctorPhoto(e.target.files[0], idx)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {doctor.photoUrl && (
                    <img src={doctor.photoUrl} alt="Doctor" className="mt-2 h-20 w-20 rounded-full object-cover" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 6: About & Education */}
        {activeSection === 6 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📚 About & Education
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Message
              </label>
              <textarea
                name="clinicMessage"
                value={form.clinicMessage}
                onChange={onChange}
                rows={4}
                placeholder="A message from your clinic to patients"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blog Link
                </label>
                <input
                  type="url"
                  name="blogLink"
                  value={form.blogLink}
                  onChange={onChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube Channel
                </label>
                <input
                  type="url"
                  name="youtubeChannel"
                  value={form.youtubeChannel}
                  onChange={onChange}
                  placeholder="https://youtube.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Articles & Publications
              </label>
              <textarea
                name="articles"
                value={form.articles}
                onChange={onChange}
                rows={3}
                placeholder="List any articles, research papers, or publications"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Section 7: Images & Media */}
        {activeSection === 7 && (
          <div className="bg-white rounded-lg border p-6 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📸 Images & Media
            </h2>
            
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinic Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo" className="mt-3 h-20 object-contain" />
              )}
            </div>
            
            {/* Image Categories */}
            {Object.entries(form.images).map(([category, urls]) => (
              <div key={category}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {category} Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => uploadToCategory(e.target.files, category as keyof typeof form.images)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {urls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                    {urls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`${category} ${idx + 1}`} className="h-20 w-20 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              images: {
                                ...prev.images,
                                [category]: prev.images[category as keyof typeof prev.images].filter((_, i) => i !== idx)
                              }
                            }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section 8: Additional Info */}
        {activeSection === 8 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              ⭐ Additional Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Awards & Recognition
              </label>
              <textarea
                name="awards"
                value={form.awards}
                onChange={onChange}
                rows={3}
                placeholder="List any awards or recognition received"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Memberships
              </label>
              <textarea
                name="memberships"
                value={form.memberships}
                onChange={onChange}
                rows={3}
                placeholder="Professional bodies, medical associations, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Facilities
              </label>
              <textarea
                name="specialFacilities"
                value={form.specialFacilities}
                onChange={onChange}
                rows={3}
                placeholder="Special equipment, facilities, or services"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Section 9: Design & Colors */}
        {activeSection === 9 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🎨 Design & Colors
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.colorPrimary}
                    onChange={(e) => setForm(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.colorPrimary}
                    onChange={(e) => setForm(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.colorSecondary}
                    onChange={(e) => setForm(prev => ({ ...prev, colorSecondary: e.target.value }))}
                    className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.colorSecondary}
                    onChange={(e) => setForm(prev => ({ ...prev, colorSecondary: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Color Presets
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPreset(preset.primary, preset.secondary)}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex gap-1">
                      <div 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-sm text-gray-700">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Save className="h-5 w-5 text-green-600" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-between items-center bg-white border rounded-lg p-4">
          <div className="flex gap-2">
            {activeSection > 1 && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ← Previous
              </button>
            )}
            {activeSection < sections.length && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection + 1)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
              >
                Next →
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveDraft(true)}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Submitting...' : 'Submit Final'}
            </button>
          </div>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
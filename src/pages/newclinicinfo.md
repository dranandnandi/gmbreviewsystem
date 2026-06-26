import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { uploadMedia, UploadedFileInfo } from '../services/uploadService';
import { Camera, Upload, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

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
              📋 <strong>Existing data loaded</strong> - Last saved: {new Date(existingData.created_at).toLocaleDateString()} 
              {existingData.is_draft && <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">DRAFT</span>}
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
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                <label className="block text-sm font-medium mb-1">Clinic or Practice Name</label>
                <input
                  name="clinicName"
                  value={form.clinicName}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter your clinic name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tagline or short description</label>
                <input
                  name="tagline"
                  value={form.tagline}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Caring for your health every day"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Main specialty / field of practice</label>
                <select
                  name="specialty"
                  value={form.specialty}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select specialty</option>
                  {SPECIALTIES.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Affiliations / Hospitals you visit</label>
                <input
                  name="affiliations"
                  value={form.affiliations}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="List hospital affiliations"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Languages you can speak with patients</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <label key={lang} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 bg-white cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                    />
                    <span className="text-sm">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                🏥 Clinic Logo & Branding
              </h3>
              
              {uploading && (
                <div className="mb-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Uploading logo...
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Clinic Logo</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log('Selected file:', file.name, file.type, file.size);
                        uploadLogo(file);
                      }
                    }}
                    className="w-full text-sm border rounded-lg p-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: Square logo, minimum 200x200px, PNG or JPG format
                  </p>
                </div>
                {form.logoUrl && (
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <img 
                        src={form.logoUrl} 
                        alt="Clinic Logo" 
                        className="w-24 h-24 object-contain mx-auto border rounded-lg bg-gray-50 p-2"
                        onError={(e) => {
                          console.error('Logo image failed to load:', form.logoUrl);
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0yMSAyMUgyN00yMSAyN0gyNyIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
                          target.alt = 'Failed to load logo';
                        }}
                        onLoad={() => console.log('Logo loaded successfully:', form.logoUrl)}
                      />
                      <p className="text-xs text-gray-600 mt-1">Current Logo</p>
                      <p className="text-xs text-gray-400 break-all">{form.logoUrl.substring(form.logoUrl.lastIndexOf('/') + 1)}</p>
                    </div>
                  </div>
                )}
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Main phone for appointments</label>
                <input
                  name="mainPhone"
                  value={form.mainPhone}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Emergency / 24x7 number</label>
                <input
                  name="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Emergency contact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp number</label>
                <input
                  name="whatsappNumber"
                  value={form.whatsappNumber}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="WhatsApp number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email for patients</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="clinic@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website (if you have one)</label>
                <input
                  name="website"
                  value={form.website}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Google Business Profile (GMB) link</label>
              <input
                name="gmbLink"
                value={form.gmbLink}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Paste your Google Maps clinic link"
              />
              <p className="text-xs text-gray-500 mt-1">
                Go to Google Maps → search your clinic → click "Share" → "Copy link"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Facebook</label>
                <input
                  name="socialLinks.facebook"
                  value={form.socialLinks.facebook}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Facebook page URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instagram</label>
                <input
                  name="socialLinks.instagram"
                  value={form.socialLinks.instagram}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Instagram profile URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">LinkedIn</label>
                <input
                  name="socialLinks.linkedin"
                  value={form.socialLinks.linkedin}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="LinkedIn profile URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">X (Twitter)</label>
                <input
                  name="socialLinks.twitter"
                  value={form.socialLinks.twitter}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Twitter profile URL"
                />
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
            
            <div>
              <label className="block text-sm font-medium mb-1">Clinic Display Name (for location)</label>
              <input
                name="clinicDisplayName"
                value={form.clinicDisplayName}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="How your clinic appears on maps/directions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Full Address</label>
              <textarea
                name="fullAddress"
                value={form.fullAddress}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Complete address with landmarks"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  name="state"
                  value={form.state}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PIN Code</label>
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Map Link (Google Maps)</label>
              <input
                name="mapLink"
                value={form.mapLink}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Paste Google Maps link to your clinic"
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Clinic Timings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Morning Hours</label>
                  <input
                    name="timings.morning"
                    value={form.timings.morning}
                    onChange={onChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 9:00 AM - 1:00 PM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Evening Hours</label>
                  <input
                    name="timings.evening"
                    value={form.timings.evening}
                    onChange={onChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 6:00 PM - 9:00 PM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sunday Hours</label>
                  <input
                    name="timings.sunday"
                    value={form.timings.sunday}
                    onChange={onChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Emergency only or 10:00 AM - 2:00 PM"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Parking Details & Accessibility</label>
              <textarea
                name="parkingDetails"
                value={form.parkingDetails}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
                placeholder="Parking availability, wheelchair access, etc."
              />
            </div>
          </div>
        )}

        {/* Section 4: Services & Packages */}
        {activeSection === 4 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🏥 Services & Health Packages
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Treatments & Services you offer</label>
              <textarea
                name="treatments"
                value={form.treatments}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={4}
                placeholder="List all treatments, procedures, and services you provide"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Health Packages</h3>
                <button
                  type="button"
                  onClick={addHealthPackage}
                  className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Package
                </button>
              </div>
              
              <div className="space-y-3">
                {form.healthPackages.map((pkg, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Package {idx + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeHealthPackage(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        placeholder="Package Name"
                        value={pkg.name}
                        onChange={e => updateHealthPackage(idx, 'name', e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Duration (e.g., 3 months)"
                        value={pkg.duration}
                        onChange={e => updateHealthPackage(idx, 'duration', e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      placeholder="What's included in this package"
                      value={pkg.included}
                      onChange={e => updateHealthPackage(idx, 'included', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      rows={2}
                    />
                    <input
                      placeholder="Main benefit/outcome for patients"
                      value={pkg.benefit}
                      onChange={e => updateHealthPackage(idx, 'benefit', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
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
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Doctor
              </button>
            </div>

            <div className="space-y-4">
              {form.doctors.map((doctor, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg">Doctor {idx + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeDoctor(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      placeholder="Doctor Name"
                      value={doctor.name}
                      onChange={e => updateDoctor(idx, 'name', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="Qualification (e.g., MBBS, MD)"
                      value={doctor.qualification}
                      onChange={e => updateDoctor(idx, 'qualification', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="Specialty"
                      value={doctor.specialty}
                      onChange={e => updateDoctor(idx, 'specialty', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="Years of Experience"
                      value={doctor.experience}
                      onChange={e => updateDoctor(idx, 'experience', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="No. of Surgeries/Procedures"
                      value={doctor.procedures}
                      onChange={e => updateDoctor(idx, 'procedures', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      placeholder="Languages Spoken"
                      value={doctor.languages}
                      onChange={e => updateDoctor(idx, 'languages', e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea
                      placeholder="Past Experience / Previous Hospitals"
                      value={doctor.pastExperience}
                      onChange={e => updateDoctor(idx, 'pastExperience', e.target.value)}
                      className="border rounded px-3 py-2"
                      rows={2}
                    />
                    <textarea
                      placeholder="Current Affiliation / Hospitals"
                      value={doctor.currentAffiliation}
                      onChange={e => updateDoctor(idx, 'currentAffiliation', e.target.value)}
                      className="border rounded px-3 py-2"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Doctor Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => e.target.files?.[0] && uploadDoctorPhoto(e.target.files[0], idx)}
                        className="w-full"
                      />
                    </div>
                    {doctor.photoUrl && (
                      <div>
                        <img 
                          src={doctor.photoUrl} 
                          alt={`Dr. ${doctor.name}`} 
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: About & Education */}
        {activeSection === 6 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📚 About & Patient Education
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">About Your Clinic (Message for website)</label>
              <textarea
                name="clinicMessage"
                value={form.clinicMessage}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={4}
                placeholder="Write about your clinic's mission, approach to patient care, what makes you different..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Blog Link</label>
                <input
                  name="blogLink"
                  value={form.blogLink}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Link to your health blog"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">YouTube Channel</label>
                <input
                  name="youtubeChannel"
                  value={form.youtubeChannel}
                  onChange={onChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="YouTube channel URL"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Health Articles & Patient Education</label>
              <textarea
                name="articles"
                value={form.articles}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="List health topics you write about, patient education resources you provide..."
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">📷 Multiple Image Upload Supported</p>
              <p className="text-xs text-blue-600 mt-1">
                You can select and upload multiple images at once for each category. Images will be organized automatically for easy management and website creation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Exterior Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Clinic Exterior</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.exterior.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'exterior')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.exterior.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.exterior.map((url, idx) => (
                      <img key={idx} src={url} alt="Exterior" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              {/* Reception Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Reception Area</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.reception.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'reception')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.reception.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.reception.map((url, idx) => (
                      <img key={idx} src={url} alt="Reception" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              {/* Consultation Rooms */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Consultation Rooms</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.consultation.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'consultation')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.consultation.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.consultation.map((url, idx) => (
                      <img key={idx} src={url} alt="Consultation" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              {/* Treatment Areas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Treatment Areas</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.treatment.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'treatment')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.treatment.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.treatment.map((url, idx) => (
                      <img key={idx} src={url} alt="Treatment" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              {/* Equipment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Medical Equipment</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.equipment.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'equipment')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.equipment.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.equipment.map((url, idx) => (
                      <img key={idx} src={url} alt="Equipment" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              {/* Certificates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium">Certificates & Awards</h3>
                  </div>
                  <span className="text-xs text-gray-500">{form.images.certificates.length} photo(s)</span>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => uploadToCategory(e.target.files, 'certificates')}
                    className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple images (JPG, PNG, GIF)</p>
                </div>
                {form.images.certificates.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {form.images.certificates.map((url, idx) => (
                      <img key={idx} src={url} alt="Certificate" className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 8: Additional Info */}
        {activeSection === 8 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              ⭐ Additional Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Awards & Recognition</label>
              <textarea
                name="awards"
                value={form.awards}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Any awards, certifications, or recognition received by your clinic or doctors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Professional Memberships</label>
              <textarea
                name="memberships"
                value={form.memberships}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Medical associations, professional bodies, or organizations you're part of"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Special Facilities</label>
              <textarea
                name="specialFacilities"
                value={form.specialFacilities}
                onChange={onChange}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Special equipment, unique services, emergency facilities, etc."
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
            
            <div>
              <label className="block text-sm font-medium mb-2">Color scheme presets</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => selectPreset(preset.primary, preset.secondary)}
                    className={`border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 ${
                      form.colorPrimary === preset.primary ? 'border-indigo-500 bg-indigo-50' : ''
                    }`}
                  >
                    <span className="text-sm font-medium">{preset.name}</span>
                    <div className="flex gap-1">
                      <span 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span 
                        className="w-6 h-6 rounded" 
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.colorPrimary}
                    onChange={e => setForm(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    className="w-12 h-10 border rounded"
                  />
                  <input
                    type="text"
                    value={form.colorPrimary}
                    onChange={e => setForm(prev => ({ ...prev, colorPrimary: e.target.value }))}
                    className="flex-1 border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.colorSecondary}
                    onChange={e => setForm(prev => ({ ...prev, colorSecondary: e.target.value }))}
                    className="w-12 h-10 border rounded"
                  />
                  <input
                    type="text"
                    value={form.colorSecondary}
                    onChange={e => setForm(prev => ({ ...prev, colorSecondary: e.target.value }))}
                    className="flex-1 border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Save className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-between items-center bg-white border rounded-lg p-4">
          <div className="flex gap-2">
            {activeSection > 1 && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Previous
              </button>
            )}
            {activeSection < sections.length && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next →
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveDraft()}
              disabled={uploading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Submit Final
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
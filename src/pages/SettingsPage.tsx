import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Building, Save, UserPlus, Users, Phone, ChevronDown, ChevronRight, MessageSquare, FileText, Calendar, Image, Settings2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { WhatsAppConnectionCard } from '../components/WhatsApp/WhatsAppConnectionCard';
import { compactBusinessContext, normalizeBusinessContext } from '../utils/businessContext';
import { hasFeature } from '../config/features';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi'
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true, badge, badgeColor = 'bg-gray-100 text-gray-600' }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const SHOW_WHATSAPP_INTEGRATION = false;
  const SHOW_LANGUAGE_INFORMATION = false;
  const { user, updateUser } = useStore();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showBlueticks, setShowBlueticks] = useState(false);
  const [doctors, setDoctors] = useState<Array<{
    id: string;
    name: string;
    contactNumber: string;
  }>>([]);
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    contactNumber: ''
  });

  const [editableSettings, setEditableSettings] = useState({
    clinicName: user?.clinicName || '',
    clinicAddress: user?.clinicAddress || '',
    gmbLink: user?.gmbLink || '',
    primaryColor: user?.primaryColor || '#4F46E5',
    secondaryColor: user?.secondaryColor || '#E5E7EB',
    contactPhone: user?.contactPhone || '',
    contactEmail: user?.contactEmail || '',
    contactWhatsapp: user?.contactWhatsapp || '',
    clinicKeywords: user?.clinicKeywords || '',
    businessContext: normalizeBusinessContext(user?.businessContext)
  });

  // Check which features are enabled
  const isReviewsEnabled = hasFeature(user, 'reviews');
  const isReportsEnabled = hasFeature(user, 'reports');
  const isSequencesEnabled = hasFeature(user, 'sequences');
  const isAppointmentsEnabled = hasFeature(user, 'appointments');
  const isCreativesEnabled = hasFeature(user, 'creatives');

  // Check if any feature that uses WhatsApp is enabled
  const needsWhatsApp = isReviewsEnabled || isReportsEnabled || isSequencesEnabled;
  // Check if any feature that uses GMB link is enabled
  const needsGmbLink = isReviewsEnabled;
  // Check if any feature that uses AI generation is enabled
  const needsAiSettings = isReviewsEnabled || isSequencesEnabled;

  useEffect(() => {
    if (user) {
      setEditableSettings({
        clinicName: user.clinicName || '',
        clinicAddress: user.clinicAddress || '',
        gmbLink: user.gmbLink || '',
        primaryColor: user.primaryColor || '#4F46E5',
        secondaryColor: user.secondaryColor || '#E5E7EB',
        contactPhone: user.contactPhone || '',
        contactEmail: user.contactEmail || '',
        contactWhatsapp: user.contactWhatsapp || '',
        clinicKeywords: user.clinicKeywords || '',
        businessContext: normalizeBusinessContext(user.businessContext)
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('id, name, contact_number')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        setDoctors(data.map(d => ({
          id: d.id,
          name: d.name,
          contactNumber: d.contact_number
        })));
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    if (user?.id) {
      fetchDoctors();
    }
  }, [user?.id]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingDoctor(true);
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .insert([{
          user_id: user.id,
          name: newDoctor.name,
          contact_number: newDoctor.contactNumber
        }])
        .select()
        .single();

      if (error) throw error;

      setDoctors([...doctors, {
        id: data.id,
        name: data.name,
        contactNumber: data.contact_number
      }]);

      setNewDoctor({ name: '', contactNumber: '' });
    } catch (error) {
      console.error('Error adding doctor:', error);
      setError('Failed to add phlebotomist');
    } finally {
      setIsAddingDoctor(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDoctors(doctors.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting doctor:', error);
      setError('Failed to delete phlebotomist');
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateUser({
        ...editableSettings,
        businessContext: compactBusinessContext(editableSettings.businessContext)
      });
      setError('');
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Get active product names for display
  const getActiveProducts = () => {
    const products = [];
    if (isReviewsEnabled) products.push('Reviews');
    if (isReportsEnabled) products.push('Smart Reports');
    if (isSequencesEnabled) products.push('Sequences');
    if (isAppointmentsEnabled) products.push('Appointments');
    if (isCreativesEnabled) products.push('Creatives');
    return products;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-500">
                Active: {getActiveProducts().join(', ') || 'No products enabled'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {/* Basic Information - Always shown */}
          <CollapsibleSection
            title="Basic Information"
            icon={<Building className="h-5 w-5 text-indigo-600" />}
            defaultOpen={true}
            badge="Required"
            badgeColor="bg-indigo-100 text-indigo-700"
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business/Clinic Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.clinicName}
                  onChange={(e) => setEditableSettings({ ...editableSettings, clinicName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.clinicAddress}
                  onChange={(e) => setEditableSettings({ ...editableSettings, clinicAddress: e.target.value })}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Contact Information - Always shown */}
          <CollapsibleSection
            title="Contact Information"
            icon={<Phone className="h-5 w-5 text-green-600" />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.contactPhone}
                  onChange={(e) => setEditableSettings({ ...editableSettings, contactPhone: e.target.value })}
                  placeholder="10 digit number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.contactWhatsapp}
                  onChange={(e) => setEditableSettings({ ...editableSettings, contactWhatsapp: e.target.value })}
                  placeholder="10 digit number"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your business WhatsApp number for customer contact
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.contactEmail}
                  onChange={(e) => setEditableSettings({ ...editableSettings, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* WhatsApp Connection - Only shown if any WhatsApp-using feature is enabled */}
          {needsWhatsApp && (
            <CollapsibleSection
              title="WhatsApp Connection"
              icon={<MessageSquare className="h-5 w-5 text-green-600" />}
              defaultOpen={true}
              badge="For Sending Messages"
              badgeColor="bg-green-100 text-green-700"
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Connect your WhatsApp to send messages directly from {
                    [isReviewsEnabled && 'Reviews', isReportsEnabled && 'Smart Reports', isSequencesEnabled && 'Sequences']
                      .filter(Boolean).join(', ')
                  }.
                </p>
                <WhatsAppConnectionCard />
              </div>
            </CollapsibleSection>
          )}

          {/* GMB Link - Only shown if Reviews is enabled */}
          {needsGmbLink && (
            <CollapsibleSection
              title="Google My Business"
              icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
              defaultOpen={true}
              badge="Reviews"
              badgeColor="bg-blue-100 text-blue-700"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Google My Business Review Link</label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.gmbLink}
                  onChange={(e) => setEditableSettings({ ...editableSettings, gmbLink: e.target.value })}
                  placeholder="https://g.page/your-business/review"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This link is included in review request messages sent to patients
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* AI Settings - Only shown if Reviews or Sequences is enabled */}
          {needsAiSettings && (
            <CollapsibleSection
              title="AI Generation Settings"
              icon={<Settings2 className="h-5 w-5 text-purple-600" />}
              defaultOpen={false}
              badge={[isReviewsEnabled && 'Reviews', isSequencesEnabled && 'Sequences'].filter(Boolean).join(' + ')}
              badgeColor="bg-purple-100 text-purple-700"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Business Keywords (for AI Generation)
                  </label>
                  <textarea
                    className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    value={editableSettings.clinicKeywords || ''}
                    onChange={(e) => setEditableSettings({ ...editableSettings, clinicKeywords: e.target.value })}
                    placeholder='["MRI", "CBC", "X-ray", "CT Scan", "ECG", "Blood Test", "Pathology"]'
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    JSON array of services/tests your business offers. Used to generate more relevant AI content.
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Business Prompt Context</h4>
                  <p className="mb-4 text-sm text-gray-600">
                    Optional. Customize how AI refers to your business, customers, and services.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editableSettings.businessContext.businessType}
                        onChange={(e) => setEditableSettings({
                          ...editableSettings,
                          businessContext: { ...editableSettings.businessContext, businessType: e.target.value }
                        })}
                        placeholder="Clinic, diagnostic lab, insurance agency"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Label</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editableSettings.businessContext.customerLabel}
                        onChange={(e) => setEditableSettings({
                          ...editableSettings,
                          businessContext: { ...editableSettings.businessContext, customerLabel: e.target.value }
                        })}
                        placeholder="patient, client, policyholder"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Booking / Interaction Label</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editableSettings.businessContext.appointmentLabel}
                        onChange={(e) => setEditableSettings({
                          ...editableSettings,
                          businessContext: { ...editableSettings.businessContext, appointmentLabel: e.target.value }
                        })}
                        placeholder="appointment, home visit, phone call"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location / Mode Label</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={editableSettings.businessContext.locationLabel}
                        onChange={(e) => setEditableSettings({
                          ...editableSettings,
                          businessContext: { ...editableSettings.businessContext, locationLabel: e.target.value }
                        })}
                        placeholder="center, home, phone, video call"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Service Keywords</label>
                    <textarea
                      className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      rows={2}
                      value={editableSettings.businessContext.serviceKeywords}
                      onChange={(e) => setEditableSettings({
                        ...editableSettings,
                        businessContext: { ...editableSettings.businessContext, serviceKeywords: e.target.value }
                      })}
                      placeholder="CBC, ECG, home sample collection, claim consultation"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Prompt Notes</label>
                    <textarea
                      className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      rows={2}
                      value={editableSettings.businessContext.promptNotes}
                      onChange={(e) => setEditableSettings({
                        ...editableSettings,
                        businessContext: { ...editableSettings.businessContext, promptNotes: e.target.value }
                      })}
                      placeholder="Avoid doctor wording. Mention home sample collection."
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Doctor Management - Only shown if Appointments is enabled */}
          {isAppointmentsEnabled && (
            <CollapsibleSection
              title="Doctor Management"
              icon={<Users className="h-5 w-5 text-blue-600" />}
              defaultOpen={false}
              badge="Appointments"
              badgeColor="bg-blue-100 text-blue-700"
            >
              <form onSubmit={handleAddDoctor} className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={newDoctor.name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                      placeholder="Enter doctor name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      value={newDoctor.contactNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setNewDoctor({ ...newDoctor, contactNumber: value });
                      }}
                      placeholder="10 digit number"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isAddingDoctor}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isAddingDoctor ? 'Adding...' : 'Add Doctor'}
                  </button>
                </div>
              </form>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {doctors.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                          No doctors added yet
                        </td>
                      </tr>
                    ) : (
                      doctors.map((doctor) => (
                        <tr key={doctor.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doctor.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doctor.contactNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleDeleteDoctor(doctor.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Branding - Always shown but collapsed by default */}
          <CollapsibleSection
            title="Branding & Colors"
            icon={<Image className="h-5 w-5 text-pink-600" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <input
                  type="color"
                  className="mt-1 block w-full h-10 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.primaryColor}
                  onChange={(e) => setEditableSettings({ ...editableSettings, primaryColor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <input
                  type="color"
                  className="mt-1 block w-full h-10 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={editableSettings.secondaryColor}
                  onChange={(e) => setEditableSettings({ ...editableSettings, secondaryColor: e.target.value })}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Language Information (hidden via feature flag) */}
          {SHOW_LANGUAGE_INFORMATION && (
            <CollapsibleSection
              title="Language Information"
              icon={<Settings2 className="h-5 w-5 text-gray-600" />}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(user?.languages || {}).map(([lang, content]) => (
                  <div key={lang} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{LANGUAGE_NAMES[lang as keyof typeof LANGUAGE_NAMES]}</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Clinic Name</label>
                        <div className="mt-1 text-sm text-gray-900">{content.name || '-'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Address</label>
                        <div className="mt-1 text-sm text-gray-900">{content.address || '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-sm text-gray-500 italic">
                  Note: Language content can only be modified through the admin panel
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Direct WhatsApp Integration (Hidden via feature flag) */}
          {SHOW_WHATSAPP_INTEGRATION && (
            <CollapsibleSection
              title="Direct WhatsApp Integration API"
              icon={<MessageSquare className="h-5 w-5 text-green-600" />}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <div className="mt-1 relative">
                    <input
                      type={showBlueticks ? "text" : "password"}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                      value={editableSettings.blueticksApiKey}
                      onChange={(e) => setEditableSettings({ ...editableSettings, blueticksApiKey: e.target.value })}
                      placeholder={editableSettings.blueticksApiKey ? "••••••••••••••••••••••••••••••••" : "Enter your API key"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowBlueticks(!showBlueticks)}
                    >
                      {showBlueticks ? (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Your API key for direct WhatsApp messaging integration.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

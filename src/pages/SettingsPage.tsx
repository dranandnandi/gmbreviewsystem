import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Building, Save, UserPlus, Users, Phone } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi'
};

export function SettingsPage() {
  // Temporary feature flag to hide Direct WhatsApp Integration section
  const SHOW_WHATSAPP_INTEGRATION = false; // set true when ready to enable again
  const SHOW_GOOGLE_SHEETS_INTEGRATION = false; // feature flag to hide Google Sheets section temporarily
  const SHOW_LANGUAGE_INFORMATION = false; // hide language info section temporarily
  const { user, updateUser } = useStore();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showBlueticks, setShowBlueticks] = useState(false);
  const [showGoogleSheetId, setShowGoogleSheetId] = useState(false);
  const [showGoogleAppsScriptUrl, setShowGoogleAppsScriptUrl] = useState(false);
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
    googleSheetId: user?.googleSheetId || '',
    googleAppsScriptUrl: user?.googleAppsScriptUrl || '',
    blueticksApiKey: user?.blueticksApiKey || ''
  });

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
        googleSheetId: user.googleSheetId || '',
        googleAppsScriptUrl: user.googleAppsScriptUrl || '',
        blueticksApiKey: user.blueticksApiKey || ''
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
      await updateUser(editableSettings);
      setError('');
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-indigo-600 mr-3" />
            <h2 className="text-2xl font-semibold text-gray-900">Clinic Settings</h2>
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

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Clinic Name</label>
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
          </div>

          {/* Doctor Management */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-600" />
              Doctor Management
            </h3>
            
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
                  {doctors.map((doctor) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Language Information (hidden via feature flag) */}
          {SHOW_LANGUAGE_INFORMATION && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Language Information</h3>
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
            </div>
          )}

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
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
          </div>

          {/* Google Sheets Integration (hidden via feature flag) */}
          {SHOW_GOOGLE_SHEETS_INTEGRATION && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Google Sheets Integration</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Google Sheet ID</label>
                  <div className="mt-1 relative">
                    <input
                      type={showGoogleSheetId ? "text" : "password"}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                      value={editableSettings.googleSheetId}
                      onChange={(e) => setEditableSettings({ ...editableSettings, googleSheetId: e.target.value })}
                      placeholder={editableSettings.googleSheetId ? "••••••••••••••••••••••••••••••••" : "Enter your Google Sheet ID from the URL"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowGoogleSheetId(!showGoogleSheetId)}
                    >
                      {showGoogleSheetId ? (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Copy the Sheet ID from your Google Sheet URL: https://docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Google Apps Script URL</label>
                  <div className="mt-1 relative">
                    <input
                      type={showGoogleAppsScriptUrl ? "url" : "password"}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                      value={editableSettings.googleAppsScriptUrl}
                      onChange={(e) => setEditableSettings({ ...editableSettings, googleAppsScriptUrl: e.target.value })}
                      placeholder={editableSettings.googleAppsScriptUrl ? "••••••••••••••••••••••••••••••••" : "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowGoogleAppsScriptUrl(!showGoogleAppsScriptUrl)}
                    >
                      {showGoogleAppsScriptUrl ? (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Deploy your Google Apps Script as a Web App and paste the Web App URL here. 
                    <br />
                    <strong>Format:</strong> https://script.google.com/macros/s/SCRIPT_ID/exec
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Direct WhatsApp Integration (Hidden via feature flag) */}
          {SHOW_WHATSAPP_INTEGRATION && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Direct WhatsApp Integration</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Direct WhatsApp Integration API</label>
                  <div className="mt-1 relative">
                    <input
                      type={showBlueticks ? "text" : "password"}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                      value={editableSettings.blueticksApiKey}
                      onChange={(e) => setEditableSettings({ ...editableSettings, blueticksApiKey: e.target.value })}
                      placeholder={editableSettings.blueticksApiKey ? "••••••••••••••••••••••••••••••••" : "Enter your Direct WhatsApp Integration API key"}
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
                    Your API key for direct WhatsApp messaging integration. This enables direct message sending functionality.
                    <br />
                    <strong>Note:</strong> Get your API key from your WhatsApp integration provider dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Google My Business Link</label>
            <input
              type="url"
              className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={editableSettings.gmbLink}
              onChange={(e) => setEditableSettings({ ...editableSettings, gmbLink: e.target.value })}
            />
          </div>

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
        </div>
      </div>
    </div>
  );
}
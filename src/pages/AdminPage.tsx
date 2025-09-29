import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Shield, Users, Settings as SettingsIcon, Save, Check, X, UserCheck, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface UserWithFeatures {
  id: string;
  name: string;
  role: string;
  clinic_name: string;
  enabled_features: string[];
  profile_types: string[];
}

const AVAILABLE_FEATURES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard with overview and statistics' },
  { id: 'appointments', name: 'Appointments', description: 'Schedule and manage patient appointments' },
  { id: 'reviews', name: 'Reviews', description: 'Manage patient reviews and feedback requests' },
  { id: 'sequences', name: 'Sequence Messages', description: 'Automated follow-up message sequences' },
  { id: 'creatives', name: 'Your Creatives', description: 'Access to creative content and materials' },
];

const AVAILABLE_PROFILE_TYPES = [
  'General Practice',
  'Pathology Lab',
  'Cardiologist',
  'Neurologist',
  'Dermatologist',
  'Orthopedic',
  'Pediatrician',
  'Gynecologist',
  'Radiologist',
  'Dentist'
];

export function AdminPage() {
  const { user, updateUserFeatures } = useStore();
  const [users, setUsers] = useState<UserWithFeatures[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingProfileTypes, setEditingProfileTypes] = useState<string | null>(null);
  const [tempProfileTypes, setTempProfileTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, clinic_name, enabled_features, profile_types')
        .order('name');

      if (error) throw error;

      setUsers(data.map(user => ({
        ...user,
        enabled_features: user.enabled_features || [],
        profile_types: user.profile_types || []
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (userId: string, featureId: string, enabled: boolean) => {
    try {
      setSaving(userId);
      setError('');
      setSuccess('');

      const user = users.find(u => u.id === userId);
      if (!user) return;

      let newFeatures = [...user.enabled_features];
      
      if (enabled) {
        if (!newFeatures.includes(featureId)) {
          newFeatures.push(featureId);
        }
      } else {
        newFeatures = newFeatures.filter(f => f !== featureId);
      }

      await updateUserFeatures(userId, newFeatures);

      // Update local state
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, enabled_features: newFeatures }
          : u
      ));

      setSuccess(`Features updated for ${user.name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating features:', error);
      setError('Failed to update features');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkFeatureUpdate = async (userId: string, features: string[]) => {
    try {
      setSaving(userId);
      setError('');
      setSuccess('');

      await updateUserFeatures(userId, features);

      // Update local state
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, enabled_features: features }
          : u
      ));

      const user = users.find(u => u.id === userId);
      setSuccess(`All features updated for ${user?.name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating features:', error);
      setError('Failed to update features');
    } finally {
      setSaving(null);
    }
  };

  const handleProfileTypeEdit = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingProfileTypes(userId);
      setTempProfileTypes([...user.profile_types]);
    }
  };

  const handleProfileTypeSave = async (userId: string) => {
    try {
      setSaving(userId);
      setError('');
      setSuccess('');

      await updateUserProfileTypes(userId, tempProfileTypes);

      // Update local state
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, profile_types: tempProfileTypes }
          : u
      ));

      const user = users.find(u => u.id === userId);
      setSuccess(`Profile types updated for ${user?.name}`);
      setTimeout(() => setSuccess(''), 3000);
      
      setEditingProfileTypes(null);
      setTempProfileTypes([]);
    } catch (error) {
      console.error('Error updating profile types:', error);
      setError('Failed to update profile types');
    } finally {
      setSaving(null);
    }
  };

  const handleProfileTypeCancel = () => {
    setEditingProfileTypes(null);
    setTempProfileTypes([]);
  };

  const addProfileType = (profileType: string) => {
    if (!tempProfileTypes.includes(profileType)) {
      setTempProfileTypes([...tempProfileTypes, profileType]);
    }
  };

  const removeProfileType = (profileType: string) => {
    setTempProfileTypes(tempProfileTypes.filter(pt => pt !== profileType));
  };

  const updateUserProfileTypes = async (userId: string, profileTypes: string[]) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_types: profileTypes })
        .eq('id', userId);

      if (error) throw error;

      // Update current user if it's the same user
      const { user } = get();
      if (user?.id === userId) {
        set({ user: { ...user, profileTypes: profileTypes } });
      }
    } catch (error) {
      console.error('Error updating user profile types:', error);
      throw error;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Manage user features and permissions</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <X className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-indigo-600" />
            User Feature Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Control which features are available to each user
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enabled Features
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profile Types
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userData.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userData.clinic_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {AVAILABLE_FEATURES.map((feature) => (
                          <label key={feature.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={userData.enabled_features.includes(feature.id)}
                              onChange={(e) => handleFeatureToggle(
                                userData.id, 
                                feature.id, 
                                e.target.checked
                              )}
                              disabled={saving === userData.id}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {feature.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingProfileTypes === userData.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {tempProfileTypes.map((profileType) => (
                              <span key={profileType} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {profileType}
                                <button
                                  onClick={() => removeProfileType(profileType)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addProfileType(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-xs rounded border-gray-300"
                          >
                            <option value="">Add profile type...</option>
                            {AVAILABLE_PROFILE_TYPES.filter(pt => !tempProfileTypes.includes(pt)).map(profileType => (
                              <option key={profileType} value={profileType}>
                                {profileType}
                              </option>
                            ))}
                          </select>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleProfileTypeSave(userData.id)}
                              disabled={saving === userData.id}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleProfileTypeCancel}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {userData.profile_types.length > 0 ? (
                              userData.profile_types.map((profileType) => (
                                <span key={profileType} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {profileType}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">No profile types assigned</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleProfileTypeEdit(userData.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-y-2">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleBulkFeatureUpdate(
                            userData.id, 
                            AVAILABLE_FEATURES.map(f => f.id)
                          )}
                          disabled={saving === userData.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving === userData.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Enable All
                        </button>
                        <button
                          onClick={() => handleBulkFeatureUpdate(userData.id, [])}
                          disabled={saving === userData.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Disable All
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature Descriptions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-indigo-600" />
            Available Profile Types
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_PROFILE_TYPES.map((profileType) => (
              <div key={profileType} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{profileType}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Users with this profile type can access profile-specific global templates
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How Profile Types Work</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Users can have multiple profile types assigned</li>
              <li>• Global templates can be restricted to specific profile types</li>
              <li>• Users see templates that match their profile types or are truly global</li>
              <li>• This allows sharing templates across users with similar specialties</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2 text-indigo-600" />
            Available Features
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_FEATURES.map((feature) => (
              <div key={feature.id} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{feature.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {feature.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
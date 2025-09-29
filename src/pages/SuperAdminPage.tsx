import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Building, UserPlus } from 'lucide-react';

export function SuperAdminPage() {
  const { user } = useStore();
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '',
    address: '',
    gmbLink: ''
  });
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'receptionist',
    clinicId: ''
  });

  if (user?.role !== 'super_admin') {
    return <div>Access denied</div>;
  }

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation here
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation here
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShowClinicModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Building className="h-4 w-4 mr-2" />
            Create Clinic
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </button>
        </div>
      </div>

      {/* Create Clinic Modal */}
      {showClinicModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium mb-4">Create New Clinic</h2>
            <form onSubmit={handleCreateClinic} className="space-y-4">
              {/* Form fields */}
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Form fields */}
            </form>
          </div>
        </div>
      )}

      {/* Lists of clinics and users */}
    </div>
  );
}
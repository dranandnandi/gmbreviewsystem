import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Building } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [clinicCode, setClinicCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: clinic, error: clinicError } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('clinic_code', clinicCode.toUpperCase())
        .single();

      if (clinicError) {
        throw new Error('Invalid clinic code');
      }

      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('role', 'admin')
        .single();

      if (userError || !adminUser) {
        throw new Error('No admin found for this clinic');
      }

      setUser({
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        clinicId: clinic.id
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error.message);
      setError('Invalid clinic code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <Building className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Enter Clinic Code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your clinic code to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div>
            <label htmlFor="clinicCode" className="sr-only">Clinic Code</label>
            <input
              id="clinicCode"
              name="clinicCode"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your clinic code (e.g., CLINIC001)"
              value={clinicCode}
              onChange={(e) => setClinicCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
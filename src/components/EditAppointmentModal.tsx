import React, { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Appointment } from '../types';
import { toTitleCase } from '../utils/stringUtils';
import { supabase } from '../services/supabaseClient';

interface EditAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Pick<Appointment, 'patientName' | 'appointmentDate' | 'appointmentTime' | 'contactNumber' | 'patientAddress' | 'notes' | 'doctorId'>>) => Promise<void>;
}

interface DoctorOption { id: string; name: string; contact_number: string; }

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({ isOpen, appointment, onClose, onSave }) => {
  const [form, setForm] = useState({
    patientName: '',
    appointmentDate: '',
    appointmentTime: '',
    contactNumber: '',
    patientAddress: '',
    notes: '',
    doctorId: ''
  });
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const { data, error } = await supabase.from('doctors').select('id,name,contact_number').order('name');
        if (error) throw error;
        setDoctors(data as DoctorOption[]);
      } catch (e) {
        console.error('Failed to load doctors', e);
      } finally {
        setLoadingDoctors(false);
      }
    };
    if (isOpen) loadDoctors();
  }, [isOpen]);

  useEffect(() => {
    if (appointment) {
      setForm({
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate.split('T')[0] || appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        contactNumber: appointment.contactNumber,
        patientAddress: appointment.patientAddress,
        notes: appointment.notes || '',
        doctorId: appointment.doctorId || ''
      });
      setError('');
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processed = value;
    if (name === 'patientName') processed = toTitleCase(value);
    if (name === 'contactNumber') processed = value.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, [name]: processed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) return setError('Patient name required');
    if (!/^\d{10}$/.test(form.contactNumber)) return setError('Contact number must be 10 digits');
    setSaving(true);
    setError('');
    try {
      await onSave(appointment.id, {
        patientName: form.patientName.trim(),
        appointmentDate: new Date(form.appointmentDate).toISOString(),
        appointmentTime: form.appointmentTime,
        contactNumber: form.contactNumber,
        patientAddress: form.patientAddress,
        notes: form.notes || undefined,
        doctorId: form.doctorId || undefined
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Appointment</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-500"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input name="patientName" value={form.patientName} onChange={handleChange} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input type="time" name="appointmentTime" value={form.appointmentTime} onChange={handleChange} required className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input name="contactNumber" value={form.contactNumber} onChange={handleChange} required pattern="[0-9]{10}" maxLength={10} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor</label>
              <select name="doctorId" value={form.doctorId} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Unassigned</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Address</label>
              <textarea name="patientAddress" value={form.patientAddress} onChange={handleChange} rows={2} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50" disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
              {saving ? (<><div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"/>Saving...</>) : (<><Save className="h-4 w-4 mr-2"/>Save</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

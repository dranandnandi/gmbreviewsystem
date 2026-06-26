import React, { useEffect, useState } from 'react';
import { X, Save, Send } from 'lucide-react';
import type { Appointment } from '../types';
import { toTitleCase } from '../utils/stringUtils';
import { supabase } from '../services/supabaseClient';
import { whatsappApi } from '../services/whatsappApi';
import { useStore } from '../store/useStore';

interface EditAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Pick<Appointment, 'patientName' | 'appointmentDate' | 'appointmentTime' | 'contactNumber' | 'patientAddress' | 'notes' | 'doctorId'>>) => Promise<void>;
}

interface DoctorOption { id: string; name: string; contact_number: string; }

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({ isOpen, appointment, onClose, onSave }) => {
  const { user } = useStore();
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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

  const handleSendWhatsApp = async () => {
    if (!form.contactNumber) {
      setError('Contact number is required to send WhatsApp message');
      return;
    }

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setSending(true);
    setError('');
    setSent(false);

    try {
      const appointmentDateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
      const formattedDate = appointmentDateTime.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      const formattedTime = appointmentDateTime.toLocaleTimeString('en-IN', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      const message = `Dear ${form.patientName},

This is a reminder for your upcoming appointment:

📅 Date: ${formattedDate}
🕒 Time: ${formattedTime}
${form.doctorId ? `👨‍⚕️ Doctor: ${doctors.find(d => d.id === form.doctorId)?.name || 'N/A'}` : ''}
${form.patientAddress ? `📍 Location: ${form.patientAddress}` : ''}

${form.notes ? `Note: ${form.notes}` : ''}

Please arrive 10 minutes early. If you need to reschedule, please contact us.

Thank you!`;

      await whatsappApi.sendMessage({
        phone: form.contactNumber,
        message,
        metadata: {
          appointmentId: appointment?.id,
          patientName: form.patientName,
          type: 'appointment_reminder'
        }
      }, {
        userId: user.id
      });

      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
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
          
          {form.contactNumber && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Contact Number:</strong> {form.contactNumber}
              </p>
            </div>
          )}
          
          {error && <div className="text-sm text-red-600">{error}</div>}
          {sent && <div className="text-sm text-green-600">WhatsApp reminder sent successfully!</div>}
          
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50" disabled={saving || sending}>Cancel</button>
            
            {form.contactNumber && (
              <button 
                type="button" 
                onClick={handleSendWhatsApp}
                disabled={sending || saving || !form.patientName || !form.appointmentDate || !form.appointmentTime}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"/>
                    Sending...
                  </>
                ) : sent ? (
                  <>
                    <Send className="h-4 w-4 mr-2"/>
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2"/>
                    Send Reminder
                  </>
                )}
              </button>
            )}
            
            <button type="submit" disabled={saving || sending} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
              {saving ? (<><div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"/>Saving...</>) : (<><Save className="h-4 w-4 mr-2"/>Save</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

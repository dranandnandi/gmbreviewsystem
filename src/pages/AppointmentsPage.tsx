import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { supabase } from '../services/supabaseClient';
import { Send, MessageCircle } from 'lucide-react';
import { TimePicker } from '../components/TimePicker';
import { toTitleCase } from '../utils/stringUtils';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { whatsappApi } from '../services/whatsappApi';
import { normalizeBusinessContext } from '../utils/businessContext';

export function AppointmentsPage() {
  const { 
    user, 
    appointments, 
    addAppointment, 
    updateAppointmentStatus, 
    lazyLoadAppointments,
    isLoadingAppointments
  } = useStore();
  const [doctors, setDoctors] = useState<Array<{
    id: string;
    name: string;
    contactNumber: string;
  }>>([]);
  const [sendingDirectMessage, setSendingDirectMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientName: '',
    appointmentDate: '',
    appointmentTime: '',
    contactNumber: '',
    doctorId: '',
    patientAddress: '',
    notes: '',
  });
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<typeof appointments[0] | null>(null);

  React.useEffect(() => {
    // Lazy load appointments when page mounts
    if (user?.id) {
      lazyLoadAppointments();
    }
    
    const fetchDoctors = async () => {
      try {
        if (!user?.id) return;

        const { data, error } = await supabase
          .from('doctors')
          .select('*')
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
  }, [user?.id, lazyLoadAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedDoctor = doctors.find(d => d.id === formData.doctorId);
      const appointment = {
        id: crypto.randomUUID(),
        clinicId: user?.id || '',
        patientName: toTitleCase(formData.patientName),
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        contactNumber: formData.contactNumber,
        patientAddress: formData.patientAddress,
        notes: formData.notes,
        doctorId: selectedDoctor?.id,
        doctorName: selectedDoctor?.name,
        doctorContact: selectedDoctor?.contactNumber,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      await addAppointment(appointment);
      
      setFormData({
        patientName: '',
        appointmentDate: '',
        appointmentTime: '',
        contactNumber: '',
        patientAddress: '',
        doctorId: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('An error occurred while scheduling the appointment. Please try again.');
    }
  };

  const generateWhatsAppLink = (appointment: typeof appointments[0]) => {
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const formattedDateTime = format(appointmentDateTime, 'PPp');
    const selectedDoctor = doctors.find(d => d.id === appointment.doctorId);
    
    const message = `Hello ${appointment.patientName},
    
Your appointment has been scheduled with ${user?.clinicName || 'our clinic'} for ${formattedDateTime}.

Doctor Details:
Name: ${selectedDoctor?.name || 'Not assigned'}
Contact: ${selectedDoctor?.contactNumber || 'Not available'}

Patient Details:
📍 Address: ${appointment.patientAddress}
📞 Contact: ${appointment.contactNumber}

Please arrive 15 minutes before your scheduled time. If you need to reschedule, kindly let us know in advance.

Best regards,
Team ${user?.clinicName || 'our clinic'}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    const formattedPhone = `91${appointment.contactNumber}`;
    return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const sendDirectWhatsApp = async (appointment: typeof appointments[0]) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSendingDirectMessage(appointment.id);
    
    try {
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      const formattedDateTime = format(appointmentDateTime, 'PPp');
      const selectedDoctor = doctors.find(d => d.id === appointment.doctorId);
      
      const message = `Hello ${appointment.patientName},
      
Your appointment has been scheduled with ${user?.clinicName || 'our clinic'} for ${formattedDateTime}.

Doctor Details:
Name: ${selectedDoctor?.name || 'Not assigned'}
Contact: ${selectedDoctor?.contactNumber || 'Not available'}

Patient Details:
📍 Address: ${appointment.patientAddress}
📞 Contact: ${appointment.contactNumber}

Please arrive 15 minutes before your scheduled time. If you need to reschedule, kindly let us know in advance.

Best regards,
Team ${user?.clinicName || 'our clinic'}`;

      await whatsappApi.sendMessage(
        {
          phone: appointment.contactNumber,
          message: message,
        },
        {
          userId: user.id,
          labContext: 'appointment_confirmation'
        }
      );

      alert(`Message sent successfully to ${appointment.patientName}!`);
    } catch (error) {
      console.error('Error sending direct WhatsApp message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingDirectMessage(null);
    }
  };

  const openEditAppointment = (apt: typeof appointments[0]) => {
    setSelectedAppointmentForEdit(apt);
    setShowEditAppointmentModal(true);
  };

  const buildModularAppointmentMessage = (
    appointment: typeof appointments[0],
    formattedDateTime: string,
    selectedDoctor?: { id: string; name: string; contactNumber: string }
  ) => {
    const context = normalizeBusinessContext(user?.businessContext);
    const businessName = user?.clinicName || 'our clinic';
    const hasCustomContext = Boolean(
      user?.businessContext &&
      (user.businessContext.businessType ||
        user.businessContext.customerLabel ||
        user.businessContext.appointmentLabel ||
        user.businessContext.locationLabel ||
        user.businessContext.promptNotes)
    );

    if (!hasCustomContext) {
      return `Hello ${appointment.patientName},

Your appointment has been scheduled with ${businessName} for ${formattedDateTime}.

Doctor Details:
Name: ${selectedDoctor?.name || 'Not assigned'}
Contact: ${selectedDoctor?.contactNumber || 'Not available'}

Patient Details:
Address: ${appointment.patientAddress}
Contact: ${appointment.contactNumber}

Please arrive 15 minutes before your scheduled time. If you need to reschedule, kindly let us know in advance.

Best regards,
Team ${businessName}`;
    }

    const customerLabel = context.customerLabel || 'patient';
    const appointmentLabel = context.appointmentLabel || 'appointment';
    const locationLabel = context.locationLabel || 'location';
    const capitalizedCustomerLabel = customerLabel.charAt(0).toUpperCase() + customerLabel.slice(1);

    return `Hello ${appointment.patientName},

Your ${appointmentLabel} with ${businessName} is scheduled for ${formattedDateTime}.

${selectedDoctor?.name ? `Assigned team member:\nName: ${selectedDoctor.name}\nContact: ${selectedDoctor.contactNumber || 'Not available'}\n\n` : ''}${capitalizedCustomerLabel} details:
${locationLabel}: ${appointment.patientAddress || 'As discussed'}
Contact: ${appointment.contactNumber}

${appointment.notes ? `Notes: ${appointment.notes}\n\n` : ''}If you need to reschedule or update details, kindly let us know in advance.

Best regards,
Team ${businessName}`;
  };

  const generateModularWhatsAppLink = (appointment: typeof appointments[0]) => {
    const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const formattedDateTime = format(appointmentDateTime, 'PPp');
    const selectedDoctor = doctors.find(d => d.id === appointment.doctorId);
    const message = buildModularAppointmentMessage(appointment, formattedDateTime, selectedDoctor);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    const formattedPhone = `91${appointment.contactNumber}`;
    return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const sendModularDirectWhatsApp = async (appointment: typeof appointments[0]) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSendingDirectMessage(appointment.id);

    try {
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      const formattedDateTime = format(appointmentDateTime, 'PPp');
      const selectedDoctor = doctors.find(d => d.id === appointment.doctorId);
      const message = buildModularAppointmentMessage(appointment, formattedDateTime, selectedDoctor);

      await whatsappApi.sendMessage(
        {
          phone: appointment.contactNumber,
          message,
        },
        {
          userId: user.id,
          labContext: 'appointment_confirmation'
        }
      );

      alert(`Message sent successfully to ${appointment.patientName}!`);
    } catch (error) {
      console.error('Error sending direct WhatsApp message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingDirectMessage(null);
    }
  };
  const handleSaveAppointmentEdits = async (id: string, updates: any) => {
    try {
      await useStore.getState().updateAppointmentFields(id, updates);
    } catch (e) {
      console.error('Failed to update appointment', e);
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">New Appointment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: toTitleCase(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <TimePicker
                value={formData.appointmentTime}
                onChange={(time) => setFormData({ ...formData, appointmentTime: time })}
                minTime="06:00"
                maxTime="20:00"
                required
                className="mt-1 block w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                maxLength={10}
                placeholder="10 digit number"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, contactNumber: value });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor</label>
              <select
                required
                className="mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.doctorId}
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Address</label>
              <textarea
                required
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.patientAddress}
                onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                placeholder="Enter complete address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Schedule Appointment
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Appointments List</h2>
        <div className="overflow-x-auto">
          {isLoadingAppointments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading appointments...</span>
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((appointment) => {
                return (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.patientAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.contactNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doctors.find(d => d.id === appointment.doctorId)?.name || appointment.doctorName || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`), 'PPp')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <select
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={appointment.status}
                        onChange={async (e) => {
                          try {
                            await updateAppointmentStatus(appointment.id, e.target.value as any);
                          } catch (error) {
                            console.error('Failed to update status:', error);
                            alert('Failed to update status. Please try again.');
                          }
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <div className="flex space-x-2">
                        <a
                          href={generateModularWhatsAppLink(appointment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Send Manually
                        </a>
                        <button
                          onClick={() => sendModularDirectWhatsApp(appointment)}
                          disabled={sendingDirectMessage === appointment.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Send message directly via WhatsApp"
                        >
                          {sendingDirectMessage === appointment.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Send Directly
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openEditAppointment(appointment)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>
      <EditAppointmentModal
        isOpen={showEditAppointmentModal}
        appointment={selectedAppointmentForEdit as any}
        onClose={() => { setShowEditAppointmentModal(false); setSelectedAppointmentForEdit(null); }}
        onSave={handleSaveAppointmentEdits}
      />
    </div>
  );
}

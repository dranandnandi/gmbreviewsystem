/**
 * Smart Report Onboarding Wizard
 * Modal-based stepper that guides users through:
 * 1. WhatsApp connection (auto-skipped if already connected)
 * 2. Patient info + report upload
 * 3. Send via WhatsApp
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, ChevronRight, ChevronLeft, Smartphone, Upload, Send, Loader2, QrCode, FileText, User, MessageCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { whatsappApi } from '../services/whatsappApi';
import { FileUpload } from './FileUpload';
import { toTitleCase } from '../utils/stringUtils';
import QRCodeGenerator from 'qrcode';
import type { ReportType } from '../types';

interface SmartReportOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardFormData) => void;
}

export interface WizardFormData {
  patientName: string;
  patientWhatsappNumber: string;
  reportType: ReportType;
  summaryLanguage: string;
  notes: string;
  uploadedFiles: string[];
  letterheadFiles: string[];
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'smart_report', label: 'Smart Report' },
  { value: 'trend_analysis', label: 'Trend Analysis' },
  { value: 'longitivity_report', label: 'Longevity Report' }
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'mr', label: 'Marathi (मराठी)' },
  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
  { value: 'te', label: 'Telugu (తెలుగు)' }
];

type Step = {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  { id: 1, title: 'Connect WhatsApp', description: 'Link your WhatsApp to send reports', icon: <Smartphone className="w-5 h-5" /> },
  { id: 2, title: 'Patient & Report', description: 'Enter patient details and upload report', icon: <Upload className="w-5 h-5" /> },
  { id: 3, title: 'Generate & Send', description: 'Review and send via WhatsApp', icon: <Send className="w-5 h-5" /> }
];

export const SmartReportOnboardingWizard: React.FC<SmartReportOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { user } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [whatsappStatus, setWhatsappStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    patientName: '',
    patientWhatsappNumber: '',
    reportType: 'smart_report',
    summaryLanguage: 'en',
    notes: '',
    uploadedFiles: [],
    letterheadFiles: []
  });

  const checkWhatsAppStatus = useCallback(async (options: { silent?: boolean } = {}): Promise<boolean> => {
    if (!user?.id) {
      setWhatsappStatus('disconnected');
      return false;
    }

    try {
      if (!options.silent) {
        setWhatsappStatus('loading');
      }
      const response = await whatsappApi.getStatus({ userId: user.id });

      let isConnected = false;
      if (response.connected !== undefined) {
        isConnected = response.connected;
      } else if (response.data?.sessions?.[0]?.isConnected !== undefined) {
        isConnected = response.data.sessions[0].isConnected;
      } else if (response.isConnected !== undefined) {
        isConnected = response.isConnected;
      }

      setWhatsappStatus(isConnected ? 'connected' : 'disconnected');
      return isConnected;
    } catch (err) {
      console.error('[Wizard] WhatsApp status check failed:', err);
      setWhatsappStatus('disconnected');
      return false;
    }
  }, [user?.id]);

  // Check WhatsApp status on mount and when wizard opens
  useEffect(() => {
    if (isOpen && user?.id) {
      checkWhatsAppStatus();
    }
  }, [isOpen, user?.id, checkWhatsAppStatus]);

  // Auto-advance to step 2 if WhatsApp is already connected
  useEffect(() => {
    if (whatsappStatus === 'connected' && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [whatsappStatus, currentStep]);

  // Poll for connection status when QR is displayed
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (qrCodeImage && whatsappStatus === 'disconnected') {
      pollInterval = setInterval(async () => {
        const isConnected = await checkWhatsAppStatus({ silent: true });
        if (isConnected) {
          setQrCodeImage(null);
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [qrCodeImage, whatsappStatus, checkWhatsAppStatus]);

  const generateQrCode = async () => {
    if (!user?.id) return;

    setIsGeneratingQr(true);
    setError(null);

    try {
      const response = await whatsappApi.getQr({ userId: user.id });
      const qr = response.qr || response.qrCode;

      if (qr) {
        if (qr.startsWith('data:')) {
          setQrCodeImage(qr);
        } else {
          const qrImageUrl = await QRCodeGenerator.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            margin: 4,
            width: 256,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          setQrCodeImage(qrImageUrl);
        }
      } else {
        setError('Could not generate QR code. Please try again.');
      }
    } catch (err) {
      console.error('[Wizard] QR generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // Don't go back to step 1 if already connected
      if (currentStep === 2 && whatsappStatus === 'connected') {
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(formData);
    onClose();
    // Reset form for next time
    setFormData({
      patientName: '',
      patientWhatsappNumber: '',
      reportType: 'smart_report',
      summaryLanguage: 'en',
      notes: '',
      uploadedFiles: [],
      letterheadFiles: []
    });
    setCurrentStep(whatsappStatus === 'connected' ? 2 : 1);
  };

  const canProceedToStep2 = whatsappStatus === 'connected';
  const canProceedToStep3 = formData.patientName.trim() !== '' &&
                           formData.patientWhatsappNumber.length === 10 &&
                           formData.uploadedFiles.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Smart Report Wizard</h2>
              <p className="text-sm text-gray-500 mt-1">Complete these steps to generate and send a report</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep || (step.id === 1 && whatsappStatus === 'connected');
                const isSkipped = step.id === 1 && whatsappStatus === 'connected' && currentStep > 1;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        isCompleted || isSkipped
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted || isSkipped ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      <div className="ml-3 hidden sm:block">
                        <p className={`text-sm font-medium ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                          {isSkipped ? 'Connected' : step.title}
                        </p>
                        <p className="text-xs text-gray-400">{step.description}</p>
                      </div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        step.id < currentStep || isSkipped ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 min-h-[320px]">
            {/* Step 1: WhatsApp Connection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {whatsappStatus === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-600">Checking WhatsApp connection...</p>
                  </div>
                )}

                {whatsappStatus === 'disconnected' && !qrCodeImage && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <Smartphone className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your WhatsApp</h3>
                    <p className="text-gray-500 text-center mb-6 max-w-sm">
                      Link your WhatsApp account to send reports directly to patients. This is a one-time setup.
                    </p>
                    <button
                      onClick={generateQrCode}
                      disabled={isGeneratingQr}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingQr ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating QR Code...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-5 h-5 mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </button>
                    {error && (
                      <p className="mt-4 text-red-600 text-sm">{error}</p>
                    )}
                  </div>
                )}

                {whatsappStatus === 'disconnected' && qrCodeImage && (
                  <div className="flex flex-col items-center py-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-4">
                      <img src={qrCodeImage} alt="WhatsApp QR Code" className="w-56 h-56" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan to Connect</h3>
                    <p className="text-gray-500 text-center text-sm mb-4 max-w-sm">
                      Open WhatsApp → Settings → Linked Devices → Link a Device
                    </p>
                    <div className="flex items-center space-x-2 text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Waiting for connection...</span>
                    </div>
                    <button
                      onClick={generateQrCode}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Refresh QR Code
                    </button>
                  </div>
                )}

                {whatsappStatus === 'connected' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Connected!</h3>
                    <p className="text-gray-500 text-center mb-6">
                      Your WhatsApp is linked and ready to send reports.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Patient Info & Upload */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="w-4 h-4 inline mr-1" />
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: toTitleCase(e.target.value) })}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MessageCircle className="w-4 h-4 inline mr-1" />
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.patientWhatsappNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, patientWhatsappNumber: value });
                      }}
                      placeholder="10 digit number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.reportType}
                      onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
                    >
                      {REPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Summary Language</label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.summaryLanguage}
                      onChange={(e) => setFormData({ ...formData, summaryLanguage: e.target.value })}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Upload Medical Report(s) *
                  </label>
                  <FileUpload
                    onFilesUploaded={(urls) => setFormData({ ...formData, uploadedFiles: urls })}
                    maxFiles={3}
                    acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                    maxSizePerFile={10}
                    existingFiles={formData.uploadedFiles}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    PDF files required for AI analysis. Max 3 files.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any specific requirements or notes"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Review Details</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Patient Name</dt>
                      <dd className="font-medium text-gray-900">{formData.patientName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">WhatsApp Number</dt>
                      <dd className="font-medium text-gray-900">+91 {formData.patientWhatsappNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Report Type</dt>
                      <dd className="font-medium text-gray-900">
                        {REPORT_TYPES.find(t => t.value === formData.reportType)?.label}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Language</dt>
                      <dd className="font-medium text-gray-900">
                        {LANGUAGES.find(l => l.value === formData.summaryLanguage)?.label}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Files Uploaded</dt>
                      <dd className="font-medium text-gray-900">{formData.uploadedFiles.length} file(s)</dd>
                    </div>
                    {formData.notes && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Notes</dt>
                        <dd className="font-medium text-gray-900 text-right max-w-[60%]">{formData.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 font-medium">Ready to Generate</p>
                      <p className="text-green-700 text-sm mt-1">
                        Click "Generate & Send" to create the AI-powered smart report. Once generated, it will be automatically sent to the patient's WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-3">
              {currentStep > 1 && !(currentStep === 2 && whatsappStatus === 'connected') && (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
              )}

              {currentStep === 1 && (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToStep2}
                  className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToStep3}
                  className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Generate & Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

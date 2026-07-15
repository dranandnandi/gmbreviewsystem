import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FileText, Upload, Download, Eye, Clock, CheckCircle, XCircle, AlertCircle, Merge, ChevronDown, ChevronUp, MoreVertical, ChevronRight, RefreshCw, MessageCircle, Wand2, Activity, Heart, Users, Sparkles } from 'lucide-react';
import { toTitleCase } from '../utils/stringUtils';
import { FileUpload } from '../components/FileUpload';
import { supabase } from '../services/supabaseClient';
import { whatsappApi } from '../services/whatsappApi';
import { generateWhatsAppLink } from '../utils/whatsappUtils';
import { WhatsAppStatusIndicator } from '../components/WhatsApp/WhatsAppStatusIndicator';
import { SmartReportOnboardingWizard, WizardFormData } from '../components/SmartReportOnboardingWizard';
import { useSmartReportWizard } from '../hooks/useSmartReportWizard';
import type { ReportRequest, ReportType, ReportStatus, PatientBiometrics, SmokingStatus, AlcoholConsumption } from '../types';

const REPORT_TYPES: { value: ReportType; label: string; description: string; color: string }[] = [
  {
    value: 'smart_report',
    label: 'Smart Report',
    description: 'AI-powered analysis of medical reports with insights and recommendations',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'trend_analysis',
    label: 'Trend Analysis',
    description: 'Track health parameters over time to identify patterns and trends',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'longitivity_report',
    label: 'Longevity Report',
    description: 'Comprehensive health assessment focused on long-term wellness',
    color: 'bg-green-100 text-green-800'
  }
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'mr', label: 'Marathi (मराठी)' },
  { value: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
  { value: 'te', label: 'Telugu (తెలుగు)' },
  { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'bn', label: 'Bengali (বাংলা)' },
  { value: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'ml', label: 'Malayalam (മലയാളം)' },
  { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { value: 'as', label: 'Assamese (অসমীয়া)' }
];

const EDGE_FUNCTION_TIMEOUT_MS = 300000; // Gamma report generation can take longer than the global 30s Supabase timeout.

type SortField = 'patientName' | 'requestDate';
type SortDirection = 'asc' | 'desc';

interface DropdownPosition {
  top: number;
  left: number;
}

async function invokeLongRunningEdgeFunction<TResponse>(
  functionName: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      throw new Error(data?.error || data?.message || responseText || `Edge Function failed with HTTP ${response.status}`);
    }

    return data as TResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Smart report generation is still taking too long. Please refresh status in a moment.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isLikelyBackgroundGenerationTimeout(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('still taking too long') ||
    normalizedMessage.includes('idle timeout') ||
    normalizedMessage.includes('timeout limit') ||
    normalizedMessage.includes('request timed out') ||
    normalizedMessage.includes('failed to fetch')
  );
}

export function SmartReportsPage() {
  const {
    user,
    reportRequests,
    addReportRequest,
    updateReportRequest,
    fetchReportRequests,
    lazyLoadReportRequests,
    isLoadingReportRequests
  } = useStore();

  // Smart Report Wizard hook
  const {
    showWizard,
    isWhatsAppConnected,
    openWizard,
    closeWizard,
    markWizardCompleted
  } = useSmartReportWizard();

  const [formData, setFormData] = useState({
    patientName: '',
    patientWhatsappNumber: '',
    reportType: 'smart_report' as ReportType,
    summaryLanguage: 'en',
    notes: '',
    uploadedFiles: [] as string[],
    letterheadFiles: [] as string[]
  });

  // Biometrics state for longevity reports
  const [biometrics, setBiometrics] = useState<PatientBiometrics>({
    anthropometry: {},
    vital_signs: {},
    lifestyle: {},
    medical_history: {},
    family_history: {}
  });
  const [showBiometrics, setShowBiometrics] = useState(false);

  // Show biometrics panel when longevity report is selected
  React.useEffect(() => {
    setShowBiometrics(formData.reportType === 'longitivity_report');
  }, [formData.reportType]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [autoSendReportsOnReady, setAutoSendReportsOnReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mergingReportId, setMergingReportId] = useState<string | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [showMergeSubMenu, setShowMergeSubMenu] = useState<string | null>(null);
  const [isSubMenuFlipped, setIsSubMenuFlipped] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const mergeButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const autoSendingReportIds = useRef<Set<string>>(new Set());

  const latestLetterheadUrl = React.useMemo(() => {
    return reportRequests.find((request) => Boolean(request.letterheadUrl))?.letterheadUrl || '';
  }, [reportRequests]);

  React.useEffect(() => {
    if (user?.id) {
      lazyLoadReportRequests();
    }
  }, [user?.id, lazyLoadReportRequests]);

  React.useEffect(() => {
    if (latestLetterheadUrl && formData.letterheadFiles.length === 0) {
      setFormData((current) => ({
        ...current,
        letterheadFiles: current.letterheadFiles.length > 0 ? current.letterheadFiles : [latestLetterheadUrl]
      }));
    }
  }, [latestLetterheadUrl, formData.letterheadFiles.length]);

  React.useEffect(() => {
    setAutoSendReportsOnReady(isWhatsAppConnected);
  }, [isWhatsAppConnected]);

  React.useEffect(() => {
    const hasProcessingReport = reportRequests.some((request) => request.status === 'processing');
    if (!hasProcessingReport) return undefined;

    const intervalId = window.setInterval(() => {
      fetchReportRequests().catch((error) => {
        console.error('Error polling report request status:', error);
      });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchReportRequests, reportRequests]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchReportRequests();
    } catch (error) {
      console.error('Error refreshing report requests:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedReportRequests = React.useMemo(() => {
    return [...reportRequests].sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      if (sortField === 'patientName') {
        aValue = a.patientName.toLowerCase();
        bValue = b.patientName.toLowerCase();
      } else {
        aValue = new Date(a.requestDate);
        bValue = new Date(b.requestDate);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reportRequests, sortField, sortDirection]);

  // Helper to check if biometrics has any data
  const hasBiometricsData = (bio: PatientBiometrics): boolean => {
    const hasAnthro = bio.anthropometry?.height_cm || bio.anthropometry?.weight_kg;
    const hasVitals = bio.vital_signs?.systolic_bp || bio.vital_signs?.diastolic_bp || bio.vital_signs?.pulse_rate;
    const hasLifestyle = bio.lifestyle?.smoking_status || bio.lifestyle?.smokeless_tobacco || bio.lifestyle?.alcohol_consumption;
    const hasMedical = Object.values(bio.medical_history || {}).some(v => v === true);
    const hasFamily = Object.values(bio.family_history || {}).some(v => v === true);
    return !!(hasAnthro || hasVitals || hasLifestyle || hasMedical || hasFamily);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Only include biometrics if longevity report and has data
      const biometricsToSend = formData.reportType === 'longitivity_report' && hasBiometricsData(biometrics)
        ? biometrics
        : undefined;

      // Check if we have PDFs for auto-generation
      const pdfFiles = formData.uploadedFiles.filter(url => url.toLowerCase().includes('.pdf'));
      const canAutoGenerate = pdfFiles.length > 0;

      const newRequest = await addReportRequest({
        userId: user?.id || '',
        patientName: toTitleCase(formData.patientName),
        patientWhatsappNumber: formData.patientWhatsappNumber || undefined,
        requestDate: new Date().toISOString(),
        reportType: formData.reportType,
        summaryLanguage: formData.summaryLanguage,
        uploadedReportUrls: formData.uploadedFiles,
        letterheadUrl: formData.letterheadFiles[0] || latestLetterheadUrl || undefined,
        notes: formData.notes,
        biometrics: biometricsToSend
      });

      // Store form values for auto-generation before resetting
      const requestForGeneration = newRequest ? {
        id: newRequest.id,
        patientName: toTitleCase(formData.patientName),
        reportType: formData.reportType,
        summaryLanguage: formData.summaryLanguage,
        notes: formData.notes,
        letterheadUrl: formData.letterheadFiles[0] || latestLetterheadUrl || undefined,
        uploadedReportUrls: formData.uploadedFiles
      } : null;

      // Reset form
      setFormData({
        patientName: '',
        patientWhatsappNumber: '',
        reportType: 'smart_report',
        summaryLanguage: 'en',
        notes: '',
        uploadedFiles: [],
        letterheadFiles: latestLetterheadUrl ? [latestLetterheadUrl] : []
      });

      // Reset biometrics
      setBiometrics({
        anthropometry: {},
        vital_signs: {},
        lifestyle: {},
        medical_history: {},
        family_history: {}
      });

      setIsSubmitting(false);
      setIsNewReportOpen(false);

      // Auto-generate smart report if PDFs are available
      if (canAutoGenerate && requestForGeneration) {
        // Small delay to let the UI update
        setTimeout(async () => {
          setGeneratingReportId(requestForGeneration.id);

          try {
            await updateReportRequest(requestForGeneration.id, { status: 'processing' });

            const data = await invokeLongRunningEdgeFunction<{
              success: boolean;
              generated_report_url?: string;
              error?: string;
              extraction_warning?: string;
              summary_warning?: string;
              generation_warning?: string;
            }>(
              'generate-pathology-infographic',
              {
                request_id: requestForGeneration.id,
                patient_name: requestForGeneration.patientName,
                report_type: requestForGeneration.reportType,
                summary_language: requestForGeneration.summaryLanguage || 'en',
                notes: requestForGeneration.notes || '',
                letterhead_url: requestForGeneration.letterheadUrl || '',
                uploaded_report_urls: pdfFiles
              }
            );

            if (!data?.success || !data.generated_report_url) {
              throw new Error(data?.error || 'Smart report generation did not return a PDF URL');
            }

            await updateReportRequest(requestForGeneration.id, {
              status: 'completed',
              generatedReportUrl: data.generated_report_url
            });

            await fetchReportRequests();

            const warnings = [data.extraction_warning, data.summary_warning, data.generation_warning].filter(Boolean);
            const warning = warnings.length > 0
              ? `\n\nNote: ${warnings.join('\n')}`
              : '';
            alert(`Smart report generated successfully!${warning}`);
          } catch (error) {
            console.error('Error auto-generating smart report:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const mayStillComplete = isLikelyBackgroundGenerationTimeout(errorMessage);

            if (mayStillComplete) {
              await fetchReportRequests().catch((refreshError) => {
                console.error('Error refreshing after long-running report generation:', refreshError);
              });
              alert(`Report request created and Smart Report generation is still running in the background.\n\n${errorMessage}\n\nUse Refresh Status after a moment.`);
            } else {
              await updateReportRequest(requestForGeneration.id, { status: 'failed' }).catch((updateError) => {
                console.error('Error marking report as failed:', updateError);
              });
              alert(`Request submitted but report generation failed: ${errorMessage}`);
            }
          } finally {
            setGeneratingReportId(null);
          }
        }, 100);
      } else {
        alert('Report request submitted! No PDF files uploaded, so generation was skipped. Use Actions > Generate Smart Report after uploading PDFs.');
      }
    } catch (error) {
      console.error('Error submitting report request:', error);
      alert('Failed to submit report request. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle wizard completion - submits form and triggers generation
  const handleWizardComplete = async (wizardData: WizardFormData) => {
    markWizardCompleted();

    try {
      const pdfFiles = wizardData.uploadedFiles.filter(url => url.toLowerCase().includes('.pdf'));
      const canAutoGenerate = pdfFiles.length > 0;

      const newRequest = await addReportRequest({
        userId: user?.id || '',
        patientName: toTitleCase(wizardData.patientName),
        patientWhatsappNumber: wizardData.patientWhatsappNumber || undefined,
        requestDate: new Date().toISOString(),
        reportType: wizardData.reportType,
        summaryLanguage: wizardData.summaryLanguage,
        uploadedReportUrls: wizardData.uploadedFiles,
        letterheadUrl: wizardData.letterheadFiles[0] || latestLetterheadUrl || undefined,
        notes: wizardData.notes
      });

      if (!newRequest) {
        alert('Failed to create report request.');
        return;
      }

      // Auto-generate if PDFs available
      if (canAutoGenerate) {
        setGeneratingReportId(newRequest.id);

        try {
          await updateReportRequest(newRequest.id, { status: 'processing' });

          const data = await invokeLongRunningEdgeFunction<{
            success: boolean;
            generated_report_url?: string;
            error?: string;
          }>(
            'generate-pathology-infographic',
            {
              request_id: newRequest.id,
              patient_name: toTitleCase(wizardData.patientName),
              report_type: wizardData.reportType,
              summary_language: wizardData.summaryLanguage || 'en',
              notes: wizardData.notes || '',
              letterhead_url: wizardData.letterheadFiles[0] || latestLetterheadUrl || '',
              uploaded_report_urls: pdfFiles
            }
          );

          if (!data?.success || !data.generated_report_url) {
            throw new Error(data?.error || 'Smart report generation failed');
          }

          await updateReportRequest(newRequest.id, {
            status: 'completed',
            generatedReportUrl: data.generated_report_url
          });

          await fetchReportRequests();

          alert('Smart report generated successfully!');
        } catch (error) {
          console.error('Error generating smart report from wizard:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const mayStillComplete = isLikelyBackgroundGenerationTimeout(errorMessage);

          if (mayStillComplete) {
            await fetchReportRequests().catch((refreshError) => {
              console.error('Error refreshing after long-running wizard generation:', refreshError);
            });
            alert(`Report request created and Smart Report generation is still running in the background.\n\n${errorMessage}\n\nUse Refresh Status after a moment.`);
          } else {
            await updateReportRequest(newRequest.id, { status: 'failed' }).catch((updateError) => {
              console.error('Error marking wizard report as failed:', updateError);
            });
            alert(`Report request created but generation failed: ${errorMessage}`);
          }
        } finally {
          setGeneratingReportId(null);
        }
      } else {
        alert('Report request created! Upload PDF files for AI analysis.');
      }
    } catch (error) {
      console.error('Error handling wizard completion:', error);
      alert('Failed to process wizard submission.');
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: ReportStatus) => {
    try {
      await updateReportRequest(requestId, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleFilesUploaded = (urls: string[]) => {
    setFormData({ ...formData, uploadedFiles: urls });
  };

  const handleLetterheadUploaded = (urls: string[]) => {
    setFormData({ ...formData, letterheadFiles: urls.slice(0, 1) });
  };

  // Send report directly when WhatsApp is connected, otherwise fall back to WhatsApp Web.
  const sendReportViaWhatsApp = async (
    request: ReportRequest,
    options: { silent?: boolean; allowWebFallback?: boolean } = {}
  ): Promise<boolean> => {
    const { silent = false, allowWebFallback = true } = options;

    // Check if patient WhatsApp number is available
    if (!request.patientWhatsappNumber) {
      if (!silent) {
        alert('Patient WhatsApp number is not available for this report request. Please add the WhatsApp number to send the report.');
      }
      return false;
    }

    if (!user?.clinicName || !user?.clinicAddress) {
      if (!silent) {
        alert('Please configure clinic information in settings first.');
      }
      return false;
    }

    // Determine which report URL to use (priority: merged > generated > none)
    const reportUrl = request.mergedReportUrl || request.generatedReportUrl;
    
    if (!reportUrl) {
      if (!silent) {
        alert('No report available to send. Please wait for the report to be generated or merged.');
      }
      return false;
    }

    const reportType = request.mergedReportUrl ? 'merged report' : 'smart report';
    const requestDate = format(new Date(request.requestDate), 'MMMM do, yyyy');

    const message = `Hello ${request.patientName},

We hope you had a satisfying experience with the services at ${user.clinicName}. Your ${reportType} is now ready for download.

Your visit details:
📅 Date: ${requestDate}
🏥 Name of Center: ${user.clinicName}
📍 Location: ${user.clinicAddress}

📋 Report Type: ${REPORT_TYPES.find(t => t.value === request.reportType)?.label || request.reportType}

If you have any questions about your report, please don't hesitate to contact us at ${user.contactPhone || 'our clinic'}.

Best regards,
Team ${user.clinicName}`;

    if (!isWhatsAppConnected) {
      if (!allowWebFallback) return false;
      window.open(generateWhatsAppLink(message, request.patientWhatsappNumber), '_blank', 'noopener,noreferrer');
      return false;
    }

    try {
      await whatsappApi.sendFileUrl(
        {
          phone: request.patientWhatsappNumber,
          fileUrl: reportUrl,
          caption: message,
          patientName: request.patientName,
          testName: 'Smart Report'
        },
        { userId: user.id }
      );
      await updateReportRequest(request.id, {
        whatsappSendStatus: 'sent',
        whatsappSentAt: new Date().toISOString(),
        whatsappSendError: ''
      });
      if (!silent) {
        alert('Report sent directly via connected WhatsApp.');
      }
      return true;
    } catch (error) {
      console.error('Direct WhatsApp report send failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp send error';
      await updateReportRequest(request.id, {
        whatsappSendStatus: 'failed',
        whatsappSendError: errorMessage
      }).catch((updateError) => {
        console.error('Error marking WhatsApp send failure:', updateError);
      });
      if (!silent) {
        alert('Direct WhatsApp send failed. Opening WhatsApp Web instead.');
      }
      if (allowWebFallback) {
        window.open(generateWhatsAppLink(message, request.patientWhatsappNumber), '_blank', 'noopener,noreferrer');
      }
      return false;
    }
  };

  React.useEffect(() => {
    if (!autoSendReportsOnReady || !isWhatsAppConnected || !user?.id) return;

    const readyToSend = reportRequests.filter((request) =>
      request.status === 'completed' &&
      Boolean(request.generatedReportUrl || request.mergedReportUrl) &&
      Boolean(request.patientWhatsappNumber) &&
      (request.whatsappSendStatus || 'pending') === 'pending' &&
      !autoSendingReportIds.current.has(request.id)
    );

    readyToSend.forEach((request) => {
      autoSendingReportIds.current.add(request.id);
      updateReportRequest(request.id, {
        whatsappSendStatus: 'pending',
        whatsappSendError: ''
      })
        .then(() => sendReportViaWhatsApp(request, { silent: true, allowWebFallback: false }))
        .catch((error) => {
          console.error('Auto WhatsApp report send failed:', error);
        })
        .finally(() => {
          autoSendingReportIds.current.delete(request.id);
        });
    });
  }, [autoSendReportsOnReady, isWhatsAppConnected, reportRequests, updateReportRequest, user?.id]);

  // Handle dropdown toggle with position calculation
  const handleDropdownToggle = (requestId: string, event: React.MouseEvent) => {
    console.log('[DEBUG] Actions dropdown toggle clicked for request:', requestId);
    
    // Prevent any event bubbling that might interfere
    event.preventDefault();
    event.stopPropagation();
    
    if (openDropdown === requestId) {
      // Close dropdown
      setOpenDropdown(null);
      setShowMergeSubMenu(null);
    } else {
      // Open dropdown and calculate position
      const button = buttonRefs.current[requestId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const dropdownWidth = 224; // w-56 = 224px
        const viewportWidth = window.innerWidth;
        
        // Calculate position
        let left = rect.left;
        let top = rect.bottom + 8; // 8px spacing below button
        
        // Adjust horizontal position if dropdown would go off-screen
        if (left + dropdownWidth > viewportWidth) {
          left = rect.right - dropdownWidth;
        }
        
        // Adjust vertical position if dropdown would go off-screen
        const dropdownHeight = 300; // Estimated max height
        if (top + dropdownHeight > window.innerHeight) {
          top = rect.top - dropdownHeight - 8; // Position above button
        }
        
        setDropdownPosition({ top, left });
      }
      setOpenDropdown(requestId);
      setShowMergeSubMenu(null);
      setIsSubMenuFlipped(false); // Reset submenu flip state
    }
  };

  // Handle submenu toggle with collision detection
  const handleMergeSubMenuToggle = (requestId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (showMergeSubMenu === requestId) {
      setShowMergeSubMenu(null);
      setIsSubMenuFlipped(false);
    } else {
      // Calculate if submenu would overflow to the right
      const mergeButton = mergeButtonRefs.current[requestId];
      if (mergeButton) {
        const rect = mergeButton.getBoundingClientRect();
        const submenuWidth = 192; // w-48 = 192px
        const viewportWidth = window.innerWidth;
        
        // Check if submenu would overflow to the right
        const wouldOverflow = rect.right + submenuWidth > viewportWidth;
        setIsSubMenuFlipped(wouldOverflow);
      }
      
      setShowMergeSubMenu(requestId);
    }
  };

  // Handle merge with specific files using PDF.co API and store in Supabase Storage
  const handleMergeWithFiles = async (request: typeof reportRequests[0], selectedFileUrls: string[], event?: React.MouseEvent) => {
    console.log('[DEBUG] Merge with specific files clicked for request:', request.id);
    
    // Prevent event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!request.generatedReportUrl) {
      alert('Generated report is required to merge with uploaded files.');
      return;
    }

    if (!selectedFileUrls || selectedFileUrls.length === 0) {
      alert('Please select at least one uploaded file to merge with.');
      return;
    }

    setMergingReportId(request.id);
    
    try {
      // Prepare URLs for PDF.co API - uploaded files first, then generated report
      const urlsToMerge = [...selectedFileUrls, request.generatedReportUrl];
      
      console.log('[DEBUG] URLs to merge (uploaded files first):', urlsToMerge);
      
      // Step 1: Make API call to PDF.co to merge PDFs
      const response = await fetch('https://api.pdf.co/v1/pdf/merge', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_PDFCO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `merged-report-${request.id}.pdf`,
          url: urlsToMerge.join(',')
        })
      });

      if (!response.ok) {
        throw new Error(`PDF.co API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('[DEBUG] PDF.co response:', data);

      if (data.error) {
        throw new Error(data.message || 'PDF merge failed');
      }

      if (!data.url) {
        throw new Error('No merged PDF URL returned from PDF.co');
      }

      // Step 2: Fetch the merged PDF content from PDF.co's temporary URL
      console.log('[DEBUG] Downloading merged PDF from temporary URL:', data.url);
      
      const pdfResponse = await fetch(data.url);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download merged PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }

      const pdfBlob = await pdfResponse.blob();
      
      // Step 3: Generate unique filename for Supabase Storage
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${user?.id}/merged-report-${request.id}-${timestamp}-${randomString}.pdf`;

      // Step 4: Upload to Supabase Storage
      console.log('[DEBUG] Uploading to Supabase Storage:', fileName);
      
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, pdfBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload merged PDF to storage: ${uploadError.message}`);
      }

      // Step 5: Get the permanent public URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      const permanentUrl = urlData.publicUrl;
      console.log('[DEBUG] Permanent URL created:', permanentUrl);

      // Step 6: Update the report request with the permanent merged PDF URL
      await updateReportRequest(request.id, { mergedReportUrl: permanentUrl });
      
      alert('Smart report merged with selected files successfully and stored permanently!\n\nOrder: Uploaded files first, then generated report.');

    } catch (error) {
      console.error('[DEBUG] Error merging PDFs with PDF.co:', error);
      let errorMessage = 'Failed to merge PDFs: ';
      
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      // Add specific troubleshooting for PDF.co
      if (errorMessage.includes('PDF.co API error')) {
        errorMessage += '\n\nPlease check:\n- Your PDF.co API key is valid\n- The PDF URLs are publicly accessible\n- You have sufficient PDF.co credits';
      }
      
      alert(errorMessage);
    } finally {
      setMergingReportId(null);
      setOpenDropdown(null);
      setShowMergeSubMenu(null);
      setIsSubMenuFlipped(false);
    }
  };

  const handleGenerateSmartReport = async (request: typeof reportRequests[0], event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const uploadedUrls = request.uploadedReportUrls || [];
    if (uploadedUrls.length === 0) {
      alert('Please upload at least one medical report PDF before generating a smart report.');
      return;
    }

    const pdfUrls = uploadedUrls.filter((url) => url.toLowerCase().includes('.pdf'));
    if (pdfUrls.length === 0) {
      alert('Smart report generation currently requires at least one uploaded PDF file.');
      return;
    }

    setGeneratingReportId(request.id);
    setOpenDropdown(null);
    setShowMergeSubMenu(null);
    setIsSubMenuFlipped(false);

    try {
      await updateReportRequest(request.id, { status: 'processing' });

      const data = await invokeLongRunningEdgeFunction<{
        success: boolean;
        generated_report_url?: string;
        error?: string;
        extraction_warning?: string;
        summary_warning?: string;
        generation_warning?: string;
      }>(
        'generate-pathology-infographic',
        {
          request_id: request.id,
          patient_name: request.patientName,
          report_type: request.reportType,
          summary_language: request.summaryLanguage || 'en',
          notes: request.notes || '',
          letterhead_url: request.letterheadUrl || '',
          uploaded_report_urls: pdfUrls
        }
      );

      if (!data?.success || !data.generated_report_url) {
        throw new Error(data?.error || 'Smart report generation did not return a PDF URL');
      }

      await updateReportRequest(request.id, {
        status: 'completed',
        generatedReportUrl: data.generated_report_url
      });

      await fetchReportRequests();

      const warnings = [data.extraction_warning, data.summary_warning, data.generation_warning].filter(Boolean);
      const warning = warnings.length > 0
        ? `\n\nNote: ${warnings.join('\n')}`
        : '';
      alert(`Smart report generated successfully!${warning}`);
    } catch (error) {
      console.error('Error generating smart report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const mayStillComplete = isLikelyBackgroundGenerationTimeout(errorMessage);

      if (mayStillComplete) {
        await fetchReportRequests().catch((refreshError) => {
          console.error('Error refreshing after long-running report generation:', refreshError);
        });
      } else {
        await updateReportRequest(request.id, { status: 'failed' }).catch((updateError) => {
          console.error('Error marking report as failed:', updateError);
        });
      }

      if (mayStillComplete) {
        alert(`Smart Report generation is still running in the background.\n\n${errorMessage}\n\nUse Refresh Status after a moment.`);
      } else {
        alert(`Failed to generate smart report: ${errorMessage}`);
      }
    } finally {
      setGeneratingReportId(null);
    }
  };

  const showReportDetails = (request: typeof reportRequests[0]) => {
    const reportType = REPORT_TYPES.find(t => t.value === request.reportType)?.label || request.reportType;
    const language = LANGUAGES.find(l => l.value === request.summaryLanguage)?.label || 'English';
    const details = [
      `Patient: ${request.patientName}`,
      `WhatsApp: ${request.patientWhatsappNumber || 'Not added'}`,
      `Report Type: ${reportType}`,
      `Language: ${language}`,
      `Status: ${request.status}`,
      `Request Date: ${format(new Date(request.requestDate), 'MMM dd, yyyy h:mm a')}`,
      `Uploaded Files: ${request.uploadedReportUrls?.length || 0}`,
      `Letterhead: ${request.letterheadUrl || 'Not uploaded'}`,
      `Generated Report: ${request.generatedReportUrl || 'Not generated yet'}`,
      `Merged Report: ${request.mergedReportUrl || 'Not merged yet'}`,
      `Notes: ${request.notes || 'None'}`
    ].join('\n');

    alert(details);
  };

  // Handle dropdown item clicks for buttons (prevents default)
  const handleDropdownItemClick = (callback: () => void | Promise<void>, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    void callback();
    setOpenDropdown(null);
    setShowMergeSubMenu(null);
    setIsSubMenuFlipped(false);
  };

  // Handle link clicks (allows default navigation behavior)
  const handleLinkClick = () => {
    // Close dropdown states without preventing default link behavior
    setOpenDropdown(null);
    setShowMergeSubMenu(null);
    setIsSubMenuFlipped(false);
  };

  // Handle outside click to close dropdown
  const handleOutsideClick = () => {
    setOpenDropdown(null);
    setShowMergeSubMenu(null);
    setIsSubMenuFlipped(false);
  };

  const getReportTypeBadge = (reportType: ReportType) => {
    const type = REPORT_TYPES.find(t => t.value === reportType);
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type?.color || 'bg-gray-100 text-gray-800'}`}>
          {type?.label || reportType}
        </span>
      </div>
    );
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />;
  };

  // Render dropdown menu using portal
  const renderDropdownMenu = (requestId: string) => {
    if (openDropdown !== requestId) return null;

    const request = reportRequests.find(r => r.id === requestId);
    if (!request) return null;

    const dropdownRoot = document.getElementById('dropdown-root');
    if (!dropdownRoot) return null;

    const canMergeWithFiles = request.generatedReportUrl && 
                             request.uploadedReportUrls && 
                             request.uploadedReportUrls.length > 0 && 
                             !request.mergedReportUrl;

    const hasReportToSend = request.mergedReportUrl || request.generatedReportUrl;
    const canGenerateSmartReport = request.uploadedReportUrls?.some((url) => url.toLowerCase().includes('.pdf'));
    const isGeneratingThisReport = generatingReportId === request.id || request.status === 'processing';

    return ReactDOM.createPortal(
      <div 
        className="fixed rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
        style={{ 
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          zIndex: 9999,
          width: '224px' // w-56
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1" role="menu" aria-orientation="vertical">
          {canGenerateSmartReport && (
            <button
              type="button"
              onClick={(e) => handleGenerateSmartReport(request, e)}
              disabled={isGeneratingThisReport}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              role="menuitem"
            >
              {isGeneratingThisReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-3"></div>
                  Generating Smart Report...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-3 text-indigo-500" />
                  {request.generatedReportUrl ? 'Regenerate Smart Report' : 'Generate Smart Report'}
                </>
              )}
            </button>
          )}

          {hasReportToSend && (
            <button
              type="button"
              onClick={(e) => handleDropdownItemClick(() => sendReportViaWhatsApp(request), e)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
            >
              <MessageCircle className="h-4 w-4 mr-3 text-green-500" />
              Send Report via WhatsApp
            </button>
          )}

          {request.generatedReportUrl && (
            <a
              href={request.generatedReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
              onClick={handleLinkClick}
            >
              <Download className="h-4 w-4 mr-3 text-green-500" />
              Download Generated Report
            </a>
          )}
          
          {canMergeWithFiles && (
            <div className="relative">
              <button
                ref={(el) => { mergeButtonRefs.current[request.id] = el; }}
                type="button"
                onClick={(e) => handleMergeSubMenuToggle(request.id, e)}
                disabled={mergingReportId === request.id}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                role="menuitem"
              >
                <div className="flex items-center">
                  {mergingReportId === request.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                      Merging Files...
                    </>
                  ) : (
                    <>
                      <Merge className="h-4 w-4 mr-3 text-blue-500" />
                      Merge Files + Smart Report
                    </>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-gray-400" />
              </button>

              {/* Submenu for merge options with collision detection */}
              {showMergeSubMenu === request.id && request.uploadedReportUrls && (
                <div 
                  className={`absolute top-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 ${
                    isSubMenuFlipped 
                      ? 'right-full mr-1' // Position to the left when flipped
                      : 'left-full ml-1'  // Default position to the right
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1" role="menu">
                    {request.uploadedReportUrls.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => handleMergeWithFiles(request, [url], e)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <Merge className="h-4 w-4 mr-3 text-blue-500" />
                        File {index + 1} + Smart Report
                      </button>
                    ))}
                    
                    {request.uploadedReportUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleMergeWithFiles(request, request.uploadedReportUrls || [], e)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                        role="menuitem"
                      >
                        <Merge className="h-4 w-4 mr-3 text-blue-500" />
                        All Files + Smart Report
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {request.mergedReportUrl && (
            <a
              href={request.mergedReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
              onClick={handleLinkClick}
            >
              <Download className="h-4 w-4 mr-3 text-purple-500" />
              Download Merged Report
            </a>
          )}

          {request.letterheadUrl && (
            <a
              href={request.letterheadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              role="menuitem"
              onClick={handleLinkClick}
            >
              <Eye className="h-4 w-4 mr-3 text-blue-500" />
              View Letterhead
            </a>
          )}
          
          {request.uploadedReportUrls && request.uploadedReportUrls.length > 0 && (
            <div className="border-t border-gray-100">
              {request.uploadedReportUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  role="menuitem"
                  onClick={handleLinkClick}
                >
                  <Eye className="h-4 w-4 mr-3 text-gray-500" />
                  View Uploaded File {index + 1}
                </a>
              ))}
            </div>
          )}
          
          <button
            type="button"
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            role="menuitem"
            onClick={(e) => handleDropdownItemClick(() => showReportDetails(request), e)}
          >
            <Eye className="h-4 w-4 mr-3 text-indigo-500" />
            View Details
          </button>
        </div>
      </div>,
      dropdownRoot
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Smart Reports</h1>
            <p className="text-gray-600">AI-powered medical report analysis and insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <WhatsAppStatusIndicator showLabel={true} size="sm" />
          <div className="flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <input
              id="auto-send-smart-report-whatsapp"
              type="radio"
              checked={autoSendReportsOnReady}
              disabled={!isWhatsAppConnected}
              onClick={() => {
                if (isWhatsAppConnected) {
                  setAutoSendReportsOnReady((enabled) => !enabled);
                }
              }}
              onChange={() => undefined}
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
            />
            <label
              htmlFor="auto-send-smart-report-whatsapp"
              className={`ml-2 text-sm font-medium ${isWhatsAppConnected ? 'text-gray-700' : 'text-gray-400'}`}
            >
              Auto-send ready reports
            </label>
          </div>
          <button
            onClick={openWizard}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Smart Report
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {/* Smart Report Onboarding Wizard */}
      <SmartReportOnboardingWizard
        isOpen={showWizard}
        onClose={closeWizard}
        onComplete={handleWizardComplete}
      />

      {reportRequests.length === 0 && (
        <div className="rounded-lg border border-indigo-100 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Sparkles className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">Start Sending Smart Reports</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
            Upload a patient report, generate an AI-ready summary PDF, and send it through WhatsApp from one guided flow.
          </p>
          <button
            type="button"
            onClick={openWizard}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-purple-700"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start Sending Smart Reports
          </button>
        </div>
      )}

      {/* New Report Request Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <button
          type="button"
          onClick={() => setIsNewReportOpen((isOpen) => !isOpen)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={isNewReportOpen}
          aria-controls="new-report-request-form"
        >
          <div>
            <h2 className="text-lg font-medium text-gray-900">New Report Request</h2>
            {!isNewReportOpen && (
              <p className="mt-1 text-sm text-gray-600">
                Open this panel when you need to add another report.
              </p>
            )}
          </div>
          {isNewReportOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {isNewReportOpen && (
        <form id="new-report-request-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: toTitleCase(e.target.value) })}
                placeholder="Enter patient name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Patient WhatsApp Number (Optional)</label>
              <input
                type="tel"
                pattern="[0-9]{10}"
                maxLength={10}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.patientWhatsappNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, patientWhatsappNumber: value });
                }}
                placeholder="10 digit WhatsApp number"
              />
              <p className="mt-1 text-xs text-gray-500">
                Add WhatsApp number to send reports directly to patient
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Report Type</label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value as ReportType })}
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {REPORT_TYPES.find(t => t.value === formData.reportType)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Summary Language</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.summaryLanguage}
                onChange={(e) => setFormData({ ...formData, summaryLanguage: e.target.value })}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any specific requirements or notes"
              />
            </div>
          </div>

          {/* Biometrics Panel for Longevity Reports */}
          {showBiometrics && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center mb-4">
                <Activity className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-green-800">Longevity Assessment Data</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Provide additional health data for comprehensive longevity scoring and clinical calculations. All fields are optional but enhance the report quality.
              </p>

              {/* Anthropometry */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs mr-2">1</span>
                  Anthropometry
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Height (cm)</label>
                    <input
                      type="number"
                      min="50"
                      max="250"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.anthropometry?.height_cm || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        anthropometry: { ...biometrics.anthropometry, height_cm: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 170"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Weight (kg)</label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.anthropometry?.weight_kg || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        anthropometry: { ...biometrics.anthropometry, weight_kg: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 70"
                    />
                  </div>
                </div>
              </div>

              {/* Vital Signs */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs mr-2">2</span>
                  Vital Signs
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      min="70"
                      max="250"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.vital_signs?.systolic_bp || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        vital_signs: { ...biometrics.vital_signs, systolic_bp: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 120"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      min="40"
                      max="150"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.vital_signs?.diastolic_bp || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        vital_signs: { ...biometrics.vital_signs, diastolic_bp: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 80"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      min="40"
                      max="200"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.vital_signs?.pulse_rate || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        vital_signs: { ...biometrics.vital_signs, pulse_rate: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      placeholder="e.g., 72"
                    />
                  </div>
                </div>
              </div>

              {/* Lifestyle History */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs mr-2">3</span>
                  Lifestyle History
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Smoking Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.lifestyle?.smoking_status || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        lifestyle: { ...biometrics.lifestyle, smoking_status: e.target.value as SmokingStatus || undefined }
                      })}
                    >
                      <option value="">Select...</option>
                      <option value="never">Never Smoked</option>
                      <option value="former">Former Smoker</option>
                      <option value="current">Current Smoker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Smokeless Tobacco</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.lifestyle?.smokeless_tobacco || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        lifestyle: { ...biometrics.lifestyle, smokeless_tobacco: e.target.value as SmokingStatus || undefined }
                      })}
                    >
                      <option value="">Select...</option>
                      <option value="never">Never</option>
                      <option value="former">Former</option>
                      <option value="current">Current</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Alcohol Consumption</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      value={biometrics.lifestyle?.alcohol_consumption || ''}
                      onChange={(e) => setBiometrics({
                        ...biometrics,
                        lifestyle: { ...biometrics.lifestyle, alcohol_consumption: e.target.value as AlcoholConsumption || undefined }
                      })}
                    >
                      <option value="">Select...</option>
                      <option value="never">Never</option>
                      <option value="occasional">Occasional</option>
                      <option value="regular">Regular</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Heart className="w-5 h-5 text-pink-500 mr-2" />
                  Medical History
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'diabetes', label: 'Diabetes' },
                    { key: 'hypertension', label: 'Hypertension' },
                    { key: 'dyslipidemia', label: 'High Cholesterol' },
                    { key: 'thyroid_disorder', label: 'Thyroid Disorder' },
                    { key: 'heart_disease', label: 'Heart Disease' },
                    { key: 'kidney_disease', label: 'Kidney Disease' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={biometrics.medical_history?.[key as keyof typeof biometrics.medical_history] || false}
                        onChange={(e) => setBiometrics({
                          ...biometrics,
                          medical_history: { ...biometrics.medical_history, [key]: e.target.checked }
                        })}
                      />
                      <span className="text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Family History */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Users className="w-5 h-5 text-purple-500 mr-2" />
                  Family History
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'diabetes', label: 'Diabetes' },
                    { key: 'heart_disease', label: 'Heart Disease' },
                    { key: 'hypertension', label: 'Hypertension' },
                    { key: 'stroke', label: 'Stroke' },
                    { key: 'cancer', label: 'Cancer' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={biometrics.family_history?.[key as keyof typeof biometrics.family_history] || false}
                        onChange={(e) => setBiometrics({
                          ...biometrics,
                          family_history: { ...biometrics.family_history, [key]: e.target.checked }
                        })}
                      />
                      <span className="text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Medical Reports
            </label>
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              maxFiles={5}
              acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
              maxSizePerFile={10}
              existingFiles={formData.uploadedFiles}
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload medical reports or lab results. At least one PDF is required to generate a Smart Report.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lab Letterhead (Optional)
            </label>
            <FileUpload
              onFilesUploaded={handleLetterheadUploaded}
              maxFiles={1}
              acceptedTypes={['.jpg', '.jpeg', '.png', '.pdf']}
              maxSizePerFile={10}
              existingFiles={formData.letterheadFiles}
            />
            <p className="mt-1 text-xs text-gray-500">
              Reuses the latest uploaded letterhead automatically. Upload here only to replace it. PNG/JPG A4 letterhead works best.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>

      {/* Report Requests List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Report Requests</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track the status of your report analysis requests
          </p>
        </div>

        <div className="overflow-x-auto">
          {isLoadingReportRequests ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading reports...</span>
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                  onClick={() => handleSort('patientName')}
                >
                  <div className="flex items-center justify-between">
                    Patient
                    {getSortIcon('patientName')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                  onClick={() => handleSort('requestDate')}
                >
                  <div className="flex items-center justify-between">
                    Request Date
                    {getSortIcon('requestDate')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedReportRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No report requests found.</p>
                    <p className="text-sm">Submit your first request above to get started.</p>
                  </td>
                </tr>
              ) : (
                sortedReportRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.patientName}
                      </div>
                      {request.patientWhatsappNumber && (
                        <div className="text-xs text-gray-500 mt-1">
                          📱 {request.patientWhatsappNumber}
                        </div>
                      )}
                      {request.uploadedReportUrls && request.uploadedReportUrls.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {request.uploadedReportUrls.length} file(s) uploaded
                        </div>
                      )}
                      {request.notes && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {request.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getReportTypeBadge(request.reportType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {LANGUAGES.find(l => l.value === request.summaryLanguage)?.label || 'English'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(request.requestDate), 'MMM dd, yyyy – h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      {request.patientWhatsappNumber && (
                        <div className="mt-2">
                          {request.whatsappSendStatus === 'sent' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              WhatsApp sent
                            </span>
                          ) : request.whatsappSendStatus === 'failed' ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              title={request.whatsappSendError || 'WhatsApp send failed'}
                            >
                              WhatsApp failed
                            </span>
                          ) : request.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              WhatsApp pending
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {user?.role === 'admin' && (
                        <select
                          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs mr-2"
                          value={request.status}
                          onChange={(e) => handleStatusUpdate(request.id, e.target.value as ReportStatus)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                        </select>
                      )}
                      
                      {/* Actions Button */}
                      <div className="relative inline-block text-left">
                        <button
                          ref={(el) => { buttonRefs.current[request.id] = el; }}
                          type="button"
                          onClick={(e) => handleDropdownToggle(request.id, e)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
                          aria-expanded={openDropdown === request.id}
                          aria-haspopup="true"
                        >
                          <MoreVertical className="h-4 w-4 mr-1" />
                          Actions
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </button>

                        {/* Render dropdown menu using portal */}
                        {renderDropdownMenu(request.id)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div 
          className="fixed inset-0"
          style={{ zIndex: 9998 }}
          onClick={handleOutsideClick}
          aria-hidden="true"
        />
      )}

      {/* Feature Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <FileText className="h-6 w-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">About Smart Reports</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                Our AI-powered Smart Reports feature analyzes medical reports and provides:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Grounded health summaries based only on uploaded report values</li>
                <li>Trend analysis across multiple reports over time</li>
                <li>Longevity assessments for long-term health planning</li>
                <li>Multi-language summaries for better patient understanding</li>
                <li>PDF merging capabilities with custom order: uploaded files first, then generated reports</li>
                <li>WhatsApp integration for easy report sharing with patients</li>
              </ul>
              <p className="mt-3">
                <strong>Note:</strong> Use Actions &gt; Generate Smart Report after submitting a request with at least one PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

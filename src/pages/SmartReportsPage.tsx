import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FileText, Upload, Download, Eye, Clock, CheckCircle, XCircle, AlertCircle, Merge, ChevronDown, ChevronUp, MoreVertical, ChevronRight, RefreshCw, MessageCircle } from 'lucide-react';
import { toTitleCase } from '../utils/stringUtils';
import { FileUpload } from '../components/FileUpload';
import { supabase } from '../services/supabaseClient';
import type { ReportType, ReportStatus } from '../types';

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
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'mr', label: 'Marathi' }
];

type SortField = 'patientName' | 'requestDate';
type SortDirection = 'asc' | 'desc';

interface DropdownPosition {
  top: number;
  left: number;
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
  const [formData, setFormData] = useState({
    patientName: '',
    patientWhatsappNumber: '',
    reportType: 'smart_report' as ReportType,
    summaryLanguage: 'en',
    notes: '',
    uploadedFiles: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mergingReportId, setMergingReportId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [showMergeSubMenu, setShowMergeSubMenu] = useState<string | null>(null);
  const [isSubMenuFlipped, setIsSubMenuFlipped] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const mergeButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  React.useEffect(() => {
    if (user?.id) {
      lazyLoadReportRequests();
    }
  }, [user?.id, lazyLoadReportRequests]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addReportRequest({
        userId: user?.id || '',
        patientName: toTitleCase(formData.patientName),
        requestDate: new Date().toISOString(),
        reportType: formData.reportType,
        summaryLanguage: formData.summaryLanguage,
        uploadedReportUrls: formData.uploadedFiles,
        notes: formData.notes
      });

      // Reset form
      setFormData({
        patientName: '',
        patientWhatsappNumber: '',
        reportType: 'smart_report',
        summaryLanguage: 'en',
        notes: '',
        uploadedFiles: []
      });

      alert('Report request submitted successfully!');
    } catch (error) {
      console.error('Error submitting report request:', error);
      alert('Failed to submit report request. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  // Generate WhatsApp link for sending report to patient
  const generateReportWhatsAppLink = (request: typeof reportRequests[0]) => {
    // Check if patient WhatsApp number is available
    if (!request.patientWhatsappNumber) {
      alert('Patient WhatsApp number is not available for this report request. Please add the WhatsApp number to send the report.');
      return;
    }

    if (!user?.clinicName || !user?.clinicAddress) {
      alert('Please configure clinic information in settings first.');
      return;
    }

    // Determine which report URL to use (priority: merged > generated > none)
    const reportUrl = request.mergedReportUrl || request.generatedReportUrl;
    
    if (!reportUrl) {
      alert('No report available to send. Please wait for the report to be generated or merged.');
      return;
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

📥 Download your report here:
${reportUrl}

If you have any questions about your report, please don't hesitate to contact us at ${user.contactPhone || 'our clinic'}.

Best regards,
Team ${user.clinicName}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    
    // Use the patient's WhatsApp number
    const phoneNumber = `91${request.patientWhatsappNumber}`;
    
    const whatsappUrl = `${baseUrl}send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

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
      
      const { data: uploadData, error: uploadError } = await supabase.storage
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

  // Handle dropdown item clicks for buttons (prevents default)
  const handleDropdownItemClick = (callback: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    callback();
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
          {hasReportToSend && (
            <button
              type="button"
              onClick={(e) => handleDropdownItemClick(() => generateReportWhatsAppLink(request), e)}
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
            onClick={(e) => handleDropdownItemClick(() => {}, e)}
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
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* New Report Request Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">New Report Request</h2>
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
              Upload medical reports, lab results, or related documents for analysis
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
                <li>Comprehensive health insights and recommendations</li>
                <li>Trend analysis across multiple reports over time</li>
                <li>Longevity assessments for long-term health planning</li>
                <li>Multi-language summaries for better patient understanding</li>
                <li>PDF merging capabilities with custom order: uploaded files first, then generated reports</li>
                <li>WhatsApp integration for easy report sharing with patients</li>
              </ul>
              <p className="mt-3">
                <strong>Note:</strong> This feature is currently in development. Report processing capabilities will be available soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

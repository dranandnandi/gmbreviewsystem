import React, { useEffect, useMemo, useState } from 'react';
import { X, MessageCircle, Sparkles, Heart, Star, ExternalLink, Zap } from 'lucide-react';
import type { Review } from '../types';
import { useStore } from '../store/useStore';
import AIProcessingLoader from './AIProcessingLoader';
import { whatsappApi } from '../services/whatsappApi';


// Enhanced WhatsApp tab management
declare global { 
  interface Window { 
    __waHandle?: Window | null;
    __waTabCheckInterval?: number;
  }
}

interface SendMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  // Deprecated: not used anymore (manual-only mode)
  onSend?: (messageTypes: string[]) => void;
  hasGMBLink: boolean;
  // Deprecated: not used anymore (manual-only mode)
  onDirectSend?: (messageTypes: string[]) => void;
  isLoading?: boolean;
  isLoadingTemplates?: boolean;
  hasTemplates?: boolean;
  isDirectSending?: boolean;
  onEditAIReview?: (review: Review) => void;
  isGeneratingAIReview?: boolean;
}

interface MessageOption {
  id: 'ai_first' | 'ai_second' | 'simple_thank_you' | 'gmb_link';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function SendMessagesModal({
  isOpen,
  onClose,
  review,
  hasGMBLink,
  isLoading = false,
  isLoadingTemplates = false,
  hasTemplates = true,
  onEditAIReview,
  isGeneratingAIReview = false
}: SendMessagesModalProps) {
  const { updateReviewStatus, updateReviewAiFirstMessageStatus, user } = useStore();
  const { prepareSimpleReviewBundle, markLocalizedBundleConsumed } = useStore();
  
  // Manual-only flow state
  type Mode = 'choose' | 'sequence';
  type Flow = 'ai3' | 'simple1';
  const [mode, setMode] = useState<Mode>('choose');
  const [flow, setFlow] = useState<Flow | null>(null);
  
  // Auto-send mode toggle
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);

    // Language names for UI hints
    const languageNames: Record<string, string> = {
      en: 'English', hi: 'Hindi', gu: 'Gujarati', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu'
    };
  const [sequenceSteps, setSequenceSteps] = useState<MessageOption[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepStatus, setStepStatus] = useState<Record<string, 'pending' | 'sent' | 'skipped'>>({});

  // Language selection and localized bundle
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [bundleMessages, setBundleMessages] = useState<string[] | null>(null);
  const [bundleLoading, setBundleLoading] = useState<boolean>(false);
  const [bundleReady, setBundleReady] = useState<boolean>(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  // AI Processing Loader state
  const [showAIProcessing, setShowAIProcessing] = useState<boolean>(false);
  // WhatsApp direct send state
  const [isSendingToWhatsApp, setIsSendingToWhatsApp] = useState<boolean>(false);
  const [whatsAppSendError, setWhatsAppSendError] = useState<string | null>(null);
  const [whatsAppSendSuccess, setWhatsAppSendSuccess] = useState<boolean>(false);
  // Persist key to store progress per review
  const progressKey = review?.id ? `review_sequence_progress:${review.id}` : undefined;

  // Debug logging for button state
  console.log('SendMessagesModal State:', {
    bundleLoading,
    bundleReady,
    bundleError: !!bundleError,
    bundleMessages: bundleMessages?.length || 0,
    currentStep,
    mode,
    flow,
    buttonDisabled: bundleLoading || (!bundleReady && !bundleError)
  });

  // IMPORTANT: Do not early-return before hooks; guard later

  const baseOptions: MessageOption[] = useMemo(() => ([
    {
      id: 'ai_first',
      label: 'AI Thank You',
      description: 'Personalized AI-powered thank you message',
      icon: Sparkles,
      color: 'text-indigo-600',
      disabled: (review?.aiReviewFirstMessageSent ?? false) || isLoadingTemplates || !hasTemplates,
      disabledReason: (review?.aiReviewFirstMessageSent ?? false)
        ? 'AI thank you already sent'
        : isLoadingTemplates
        ? 'Templates are loading'
        : !hasTemplates
        ? 'AI templates not available'
        : undefined
    },
    {
      id: 'ai_second',
      label: 'AI Review Template',
      description: 'Friendly AI-crafted review suggestion',
      icon: Sparkles,
      color: 'text-purple-600',
      disabled: isLoadingTemplates || !hasTemplates,
      disabledReason: isLoadingTemplates
        ? 'Templates are loading'
        : !hasTemplates
        ? 'AI templates not available'
        : undefined
    },
    {
      id: 'simple_thank_you',
      label: 'Simple Thank You',
      description: 'Basic thank you message',
      icon: Heart,
      color: 'text-green-600',
      disabled: isLoadingTemplates || !hasTemplates,
      disabledReason: isLoadingTemplates
        ? 'Templates are loading'
        : !hasTemplates
        ? 'Thank you templates not available'
        : undefined
    },
    {
      id: 'gmb_link',
      label: 'Google Review Link',
      description: 'Direct link to your Google review page',
      icon: Star,
      color: 'text-blue-600',
      disabled: !hasGMBLink,
      disabledReason: 'Google review link not configured'
    }
  ]), [review?.aiReviewFirstMessageSent, isLoadingTemplates, hasTemplates, hasGMBLink]);

  const optionById = (id: MessageOption['id']) => baseOptions.find(o => o.id === id)!;

  const isMobileUA = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);







  // Enhanced navigateWA function with better tab reuse
  function navigateWA(url: string) {
    // Mobile handling remains the same
    if (isMobileUA() || url.startsWith('whatsapp://')) {
      window.open(url, '_blank');
      return;
    }

    // Desktop: Try to reuse existing WhatsApp tab
    try {
      // Check if we have a valid existing tab
      if (window.__waHandle && !window.__waHandle.closed) {
        try {
          // Try to navigate the existing tab
          window.__waHandle.location.href = url;
          window.__waHandle.focus();
          return;
        } catch (e) {
          // Cross-origin error, close the old tab and open new one
          try {
            window.__waHandle.close();
          } catch {}
          window.__waHandle = null;
        }
      }
    } catch (e) {
      // Clear invalid reference
      window.__waHandle = null;
    }
    
    // Open new tab with the WhatsApp URL directly
    const newWindow = window.open(url, 'gmb_whatsapp_tab', 'noopener,noreferrer');
    if (newWindow) {
      window.__waHandle = newWindow;
      try {
        newWindow.focus();
      } catch {}
    }
  }

  const generateWhatsAppLink = (messageContent: string, phoneNumber: string) => {
    const isMobile = isMobileUA();
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    const formattedPhone = `91${phoneNumber}`;
    return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(messageContent)}`;
  };

  

  // Sequence builders
  const buildAI3 = (): MessageOption[] => [
    optionById('ai_first'),
    optionById('ai_second'),
    optionById('gmb_link')
  ];
  const buildSimple1 = (): MessageOption[] => [optionById('simple_thank_you')];

  // No simple+link option; simple thank you already contains link

  const startFlow = async (target: Flow) => {
    let steps: MessageOption[] = [];
    if (target === 'ai3') steps = buildAI3();
    if (target === 'simple1') steps = buildSimple1();
    // Filter out disabled steps; user doesn't want to see skipped items
    steps = steps.filter(s => !s.disabled);
    const initial: Record<string, 'pending' | 'sent' | 'skipped'> = {};
    steps.forEach(s => { initial[s.id] = 'pending'; });
    
    setFlow(target);
    setSequenceSteps(steps);
    setStepStatus(initial);
    setCurrentStep(0);
    
    // Reset bundle states before preparing
    setBundleMessages(null);
    setBundleReady(false);
    setBundleError(null);

    // Always prepare bundle via edge function for ALL languages (including English)
    if (selectedLanguage && review) {
      try {
        setBundleLoading(true);
        setShowAIProcessing(true);
        // Enter sequence mode early to show progress banner
        setMode('sequence');
        
        console.log('Starting bundle preparation for language:', selectedLanguage, 'target:', target);
        
        // Add timeout safety net (60 seconds for AI generation)
        const timeoutPromise = new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('Bundle preparation timed out after 60 seconds')), 60000)
        );
        const bundlePromise = prepareSimpleReviewBundle(review, selectedLanguage, target);
        
        const msgs = await Promise.race([bundlePromise, timeoutPromise]);
        console.log('Bundle preparation completed:', msgs);
        
        if (msgs && msgs.length > 0) {
          setBundleMessages(msgs);
          setBundleReady(true);
          console.log('Bundle ready with', msgs.length, 'messages');
        } else {
          throw new Error('No messages received from bundle preparation');
        }
        setBundleError(null);
      } catch (e) {
        console.error('Failed to prepare bundle:', e);
        setBundleError(`Failed to prepare messages: ${e instanceof Error ? e.message : 'Unknown error'}`);
        setBundleReady(false);
        setBundleMessages(null);
        setMode('sequence'); // Still show sequence mode but with error
      } finally {
        // ALWAYS reset loading states
        setBundleLoading(false);
        setShowAIProcessing(false);
      }
    } else {
      // No language/review - just show sequence without bundle
      setMode('sequence');
      setBundleReady(true); // Allow proceeding without bundle if needed
    }

    // persist initial progress
    try {
      if (progressKey) {
        localStorage.setItem(progressKey, JSON.stringify({ flow: target, stepStatus: initial, ts: Date.now() }));
      }
    } catch {}
  };

  const currentStepObj = sequenceSteps[currentStep];
  const allDone = sequenceSteps.length > 0 && sequenceSteps.every(s => stepStatus[s.id] !== 'pending');

  const handleSendCurrentStep = async () => {
    console.log('handleSendCurrentStep called', {
      step: currentStepObj?.id,
      bundleReady,
      bundleMessagesCount: bundleMessages?.length || 0,
      currentStep,
      autoSendEnabled
    });
    
    const step = currentStepObj;
    if (!step) {
      console.log('No current step object, returning');
      return;
    }
    
    // Always use bundleMessages for all languages (including English)
    if (!bundleReady || !bundleMessages) {
      console.log('Bundle not ready or no messages, returning', { bundleReady, bundleMessages: !!bundleMessages });
      return;
    }
    
    // Use pre-generated message from edge function
    const msg = bundleMessages[currentStep];
    if (!msg) return;
    
    // Auto-send mode using WhatsApp backend API
    if (autoSendEnabled && user?.id && whatsappConnected) {
      try {
        await whatsappApi.sendMessage(
          { phone: review!.contactNumber, message: msg },
          { userId: user.id }
        );
        console.log('Auto-sent message via WhatsApp backend');
      } catch (error) {
        console.error('Failed to auto-send message:', error);
        alert('Failed to send message automatically. Opening WhatsApp Web instead.');
        // Fallback to manual
        const link = generateWhatsAppLink(msg, review!.contactNumber);
        navigateWA(link);
      }
    } else {
      // Manual mode: Open WhatsApp Web
      const link = generateWhatsAppLink(msg, review!.contactNumber);
      navigateWA(link);
    }
    
    // auto-mark as sent and advance
    const updated: Record<string, 'pending' | 'sent' | 'skipped'> = { ...stepStatus, [step.id]: 'sent' } as Record<string, 'pending' | 'sent' | 'skipped'>;
    setStepStatus(updated);
    // mark ai_first sent in DB
    if (step.id === 'ai_first' && review?.id) {
      try { await updateReviewAiFirstMessageStatus(review.id, true); } catch (e) { console.warn('Failed to mark ai_first sent', e); }
    }
    // persist step progress
    try { if (progressKey) localStorage.setItem(progressKey, JSON.stringify({ flow, stepStatus: updated, ts: Date.now() })); } catch {}
    const next = currentStep + 1;
    if (next < sequenceSteps.length) {
      setCurrentStep(next);
    } else {
      // completed
      if (flow === 'ai3' && review?.id) {
        try { await updateReviewStatus(review.id, 'sent', true); } catch (e) { console.error('Failed to update review status', e); }
      }
      // mark bundle consumed for all languages
      if (review?.id) {
        try { await markLocalizedBundleConsumed(review.id); } catch {}
      }
      try { if (progressKey) localStorage.removeItem(progressKey); } catch {}
    }
  };

  const handleSendSimpleNow = async () => {
    if (selectedLanguage && review) {
      try {
        setShowAIProcessing(true);
        
        console.log('Starting simple message preparation for language:', selectedLanguage);
        
        // Add timeout safety net (60 seconds for AI generation)
        const timeoutPromise = new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('Message preparation timed out after 60 seconds')), 60000)
        );
        const bundlePromise = prepareSimpleReviewBundle(review, selectedLanguage, 'simple1');
        
        const msgs = await Promise.race([bundlePromise, timeoutPromise]);
        console.log('Simple message preparation completed:', msgs);
        
        const msg = msgs && msgs[0];
        if (msg) {
          const link = generateWhatsAppLink(msg, review.contactNumber);
          navigateWA(link);
        } else {
          throw new Error('No message received from preparation');
        }
        // Mark bundle consumed
        await markLocalizedBundleConsumed(review.id);
      } catch (e) {
        console.error('Failed to prepare/send simple message:', e);
        alert(`Failed to prepare message: ${e instanceof Error ? e.message : 'Unknown error'}. Please try again.`);
        return;
      } finally {
        setShowAIProcessing(false);
      }
    }
    // Mark as sent in DB for simple flow (no sequence)
    try {
      if (review?.id) {
        await updateReviewStatus(review.id, 'sent', false);
      }
      // Clear any saved sequence progress for this review
      if (progressKey) {
        try { localStorage.removeItem(progressKey); } catch {}
      }
    } catch (e) {
      console.error('Failed to update review status after simple send', e);
    }
    resetAndClose();
  };

  const handleSendBundleToWhatsApp = async () => {
    if (!bundleMessages || bundleMessages.length !== 3 || !review || !user?.id) {
      setWhatsAppSendError('Invalid bundle or missing data');
      return;
    }

    setIsSendingToWhatsApp(true);
    setWhatsAppSendError(null);
    setWhatsAppSendSuccess(false);

    try {
      const phone = review.contactNumber;
      
      // Send message 1 (AI Thank You)
      await whatsappApi.sendMessage(
        {
          phone,
          message: bundleMessages[0],
          metadata: {
            reviewId: review.id,
            patientName: review.patientName,
            type: 'ai_first',
            step: 1,
            language: selectedLanguage
          }
        },
        { userId: user.id }
      );
      
      // Wait 2-5 seconds (random)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Send message 2 (AI Review Template)
      await whatsappApi.sendMessage(
        {
          phone,
          message: bundleMessages[1],
          metadata: {
            reviewId: review.id,
            patientName: review.patientName,
            type: 'ai_second',
            step: 2,
            language: selectedLanguage
          }
        },
        { userId: user.id }
      );
      
      // Wait 2-5 seconds (random)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Send message 3 (GMB Link)
      await whatsappApi.sendMessage(
        {
          phone,
          message: bundleMessages[2],
          metadata: {
            reviewId: review.id,
            patientName: review.patientName,
            type: 'gmb_link',
            step: 3,
            language: selectedLanguage
          }
        },
        { userId: user.id }
      );

      // Update all steps to 'sent'
      const newStatus: Record<string, 'pending' | 'sent' | 'skipped'> = {};
      sequenceSteps.forEach(s => { newStatus[s.id] = 'sent'; });
      setStepStatus(newStatus);
      setCurrentStep(sequenceSteps.length - 1);

      // Mark review as sent with sequence
      if (review.id) {
        await updateReviewStatus(review.id, 'sent', true);
        await updateReviewAiFirstMessageStatus(review.id, true);
      }

      // Mark bundle consumed
      await markLocalizedBundleConsumed(review.id);

      // Clear saved progress
      if (progressKey) {
        try { localStorage.removeItem(progressKey); } catch {}
      }

      setWhatsAppSendSuccess(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        resetAndClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to send bundle to WhatsApp:', error);
      setWhatsAppSendError(error instanceof Error ? error.message : 'Failed to send messages');
    } finally {
      setIsSendingToWhatsApp(false);
    }
  };

  const resetAndClose = () => {
    setMode('choose');
    setFlow(null);
    setSequenceSteps([]);
    setCurrentStep(0);
    setStepStatus({});
    setIsSendingToWhatsApp(false);
    setWhatsAppSendError(null);
    setWhatsAppSendSuccess(false);
    onClose();
  };

  // Restore progress on open or show completed view if already sent
  useEffect(() => {
    if (!isOpen) return;
    if (!review?.id) return;
    
    // Check WhatsApp connection status on modal open
    const checkWhatsAppStatus = async () => {
      if (user?.id) {
        try {
          const statusResponse = await whatsappApi.getStatus({ userId: user.id });
          // Handle multiple response formats
          const isConnected = 
            statusResponse.connected || 
            statusResponse.isConnected || 
            statusResponse.data?.sessions?.[0]?.isConnected ||
            false;
          setWhatsappConnected(isConnected);
          console.log('WhatsApp status check:', { statusResponse, isConnected });
        } catch (error) {
          console.error('Failed to check WhatsApp status:', error);
          setWhatsappConnected(false);
        }
      }
    };
    checkWhatsAppStatus();
    
    // initialize language from review or user default
    setSelectedLanguage('en');
    try {
      if (progressKey) {
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          const parsed = JSON.parse(saved) as { flow: Flow; stepStatus: Record<string, 'pending'|'sent'|'skipped'> };
          let steps: MessageOption[] = [];
          if (parsed.flow === 'ai3') steps = buildAI3().filter(s => !s.disabled);
          if (parsed.flow === 'simple1') steps = buildSimple1().filter(s => !s.disabled);
          if (steps.length) {
            setFlow(parsed.flow);
            setSequenceSteps(steps);
            setStepStatus(parsed.stepStatus);
            const nextIdx = steps.findIndex(s => parsed.stepStatus[s.id] === 'pending');
            setCurrentStep(nextIdx === -1 ? Math.max(steps.length - 1, 0) : nextIdx);
            setMode('sequence');
            return;
          }
        }
      }
    } catch {}
    // If already marked sent with sequence, show completed summary
    if (review.status === 'sent' && review.hasSequence) {
      const steps = buildAI3().filter(s => !s.disabled);
      const status: Record<string, 'pending' | 'sent' | 'skipped'> = {};
      steps.forEach(s => { status[s.id] = 'sent'; });
      setFlow('ai3');
      setSequenceSteps(steps);
      setStepStatus(status);
      setCurrentStep(steps.length - 1);
      setMode('sequence');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, review?.id, review?.status, review?.hasSequence, baseOptions, user?.id]);

  // Cleanup effect: Reset loading states when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all loading states to prevent stuck states
      setBundleLoading(false);
      setShowAIProcessing(false);
      setBundleError(null);
    }
  }, [isOpen]);

  // Set up WhatsApp tab monitoring and cleanup
  useEffect(() => {
    // Set up periodic check to clean up dead references
    if (!window.__waTabCheckInterval) {
      window.__waTabCheckInterval = window.setInterval(() => {
        if (window.__waHandle?.closed) {
          window.__waHandle = null;
        }
      }, 2000) as unknown as number;
    }

    // Cleanup on unmount
    return () => {
      if (window.__waTabCheckInterval) {
        clearInterval(window.__waTabCheckInterval);
        window.__waTabCheckInterval = undefined;
      }
    };
  }, []);

  if (!isOpen || !review) return null;

  return (
    <>
      <AIProcessingLoader 
        isVisible={showAIProcessing}
        language={selectedLanguage}
        onComplete={() => setShowAIProcessing(false)}
      />
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl max-w-md w-full my-8 max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <MessageCircle className="h-6 w-6 mr-2 text-indigo-600" />
              Send Messages
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manual sending via WhatsApp for {review.patientName}
            </p>
          </div>
          <button 
            onClick={resetAndClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Auto-Send Toggle (show only if WhatsApp is connected) */}
          {whatsappConnected && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Auto-Send Mode</span>
                <span className="text-xs text-green-600">(WhatsApp Connected)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendEnabled}
                  onChange={(e) => setAutoSendEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          )}
          
          {/* WhatsApp Connection Warning */}
          {whatsappConnected === false && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">WhatsApp not connected.</span> Messages will open in WhatsApp Web. 
                Go to <strong>Settings → WhatsApp</strong> to connect WhatsApp for automatic sending.
              </p>
            </div>
          )}
          
          {/* Language Selector */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span className="text-sm text-gray-700">Language</span>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="gu">Gujarati</option>
              <option value="mr">Marathi</option>
              <option value="bn">Bengali</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
              <option value="pa">Punjabi</option>
            </select>
          </div>
          {/* Patient Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Name:</span> {review.patientName}</p>
              <p><span className="font-medium">Contact:</span> {review.contactNumber}</p>
              <p><span className="font-medium">Visit Date:</span> {new Date(review.appointmentDate).toLocaleDateString()}</p>
              {review.treatment && (
                <p><span className="font-medium">Treatment:</span> {review.treatment}</p>
              )}
            </div>
          </div>

          {/* Flow chooser */}
          {mode === 'choose' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Choose how to send</h4>

              {/* AI 3-message sequence */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start">
                  <Sparkles className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">Send with AI review template (3 messages)</h5>
                    <p className="text-sm text-gray-600">
                      Step-by-step: AI Thank You → AI Review Template → Google Review Link
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                      <li>Opens WhatsApp for each step</li>
                      <li>Track progress and move to next</li>
                    </ul>
                    <div className="mt-3 flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => startFlow('ai3')}
                        disabled={bundleLoading}
                        className="inline-flex items-center px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Start AI-guided sequence"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Start AI Guided (3)
                      </button>
                      <span className="text-xs text-gray-600">
                        {review?.status === 'sent' && review?.hasSequence
                          ? 'Sequence already completed'
                          : 'Generate AI messages on demand'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Message generation status banner */}
              {(bundleLoading || bundleError || bundleMessages) && (
                <div className={`rounded-md border p-3 text-sm ${bundleLoading ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : bundleError ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  {bundleLoading && (
                    <span className="inline-flex items-center">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></span>
                      Preparing {languageNames[selectedLanguage] || selectedLanguage} messages…
                    </span>
                  )}
                  {!bundleLoading && !bundleError && bundleMessages && (
                    <span>{languageNames[selectedLanguage] || selectedLanguage} messages ready.</span>
                  )}
                  {bundleError && (
                    <span>{bundleError}</span>
                  )}
                </div>
              )}

              {/* Direct WhatsApp Send Option - appears after bundle is ready */}
              {flow === 'ai3' && bundleReady && bundleMessages && bundleMessages.length === 3 && whatsappConnected && (
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start">
                    <Zap className="h-6 w-6 mr-3 text-green-600" />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">Send All Messages via WhatsApp</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Automatically send all 3 messages with 2-5 second intervals between each message.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                        <li>Message 1: AI Thank You</li>
                        <li>Message 2: AI Review Template</li>
                        <li>Message 3: Google Review Link</li>
                      </ul>
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={handleSendBundleToWhatsApp}
                          disabled={isSendingToWhatsApp || whatsAppSendSuccess}
                          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white transition-all ${
                            isSendingToWhatsApp || whatsAppSendSuccess
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {isSendingToWhatsApp ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending messages...
                            </>
                          ) : whatsAppSendSuccess ? (
                            <>
                              <span className="mr-2">✓</span>
                              All messages sent!
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Send All to WhatsApp
                            </>
                          )}
                        </button>
                        {whatsAppSendError && (
                          <p className="text-sm text-red-600">{whatsAppSendError}</p>
                        )}
                        {whatsAppSendSuccess && (
                          <p className="text-sm text-green-600">All messages sent successfully! Status updated to 'sent'.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple flow (already includes link) */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start">
                  <Heart className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">Send Simple</h5>
                    <p className="text-sm text-gray-600">
                      Send a Simple Thank You (includes your Google review link).
                    </p>
                    <div className="mt-3 flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={handleSendSimpleNow}
                        disabled={bundleLoading}
                        className="inline-flex items-center px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate and send Simple Thank You message"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Send Simple Now
                      </button>
                      {!hasGMBLink && (
                        <span className="text-xs text-amber-600">Google review link not configured</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sequence runner (minimal, single action per step) */}
          {mode === 'sequence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Manual sending — Step {Math.min(currentStep + 1, sequenceSteps.length)} of {sequenceSteps.length}
                </h4>
                {flow && (
                  <span className="text-xs text-gray-600">
                    {flow === 'ai3' ? 'AI sequence' : 'Simple only'}
                  </span>
                )}
              </div>
              {/* WhatsApp Direct Send Card - Shows after bundle is ready */}
              {flow === 'ai3' && bundleReady && bundleMessages && bundleMessages.length === 3 && !allDone && whatsappConnected && (
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start">
                    <Zap className="h-6 w-6 mr-3 text-green-600" />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">Send All Messages via WhatsApp</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Automatically send all 3 messages with 2-5 second intervals between each message.
                      </p>
                      <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                        <li>Message 1: AI Thank You</li>
                        <li>Message 2: AI Review Template</li>
                        <li>Message 3: Google Review Link</li>
                      </ul>
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={handleSendBundleToWhatsApp}
                          disabled={isSendingToWhatsApp || whatsAppSendSuccess}
                          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white transition-all ${
                            isSendingToWhatsApp || whatsAppSendSuccess
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {isSendingToWhatsApp ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending messages...
                            </>
                          ) : whatsAppSendSuccess ? (
                            <>
                              <span className="mr-2">✓</span>
                              All messages sent!
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Send All to WhatsApp
                            </>
                          )}
                        </button>
                        {whatsAppSendError && (
                          <p className="text-sm text-red-600">{whatsAppSendError}</p>
                        )}
                        {whatsAppSendSuccess && (
                          <p className="text-sm text-green-600">All messages sent successfully! Status updated to 'sent'.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Manual step-by-step card (fallback or when WhatsApp not connected) */}
              {!allDone && currentStepObj && (!whatsappConnected || !bundleReady || !bundleMessages || bundleMessages.length !== 3) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start">
                    <currentStepObj.icon className={`h-5 w-5 mr-3 ${currentStepObj.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{currentStepObj.label}</h5>
                        {currentStepObj.id === 'ai_second' && onEditAIReview && review && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (!isGeneratingAIReview) onEditAIReview(review); }}
                            disabled={isGeneratingAIReview}
                            className={`text-xs px-2 py-0.5 rounded border border-purple-300 ${isGeneratingAIReview ? 'text-purple-300 cursor-not-allowed' : 'text-purple-600 hover:bg-purple-50'}`}
                          >
                            {isGeneratingAIReview ? (
                              <span className="flex items-center"><span className="h-3 w-3 mr-1 rounded-full border-b-2 border-purple-400 animate-spin"></span>Loading</span>
                            ) : review.aiReviewText ? 'Edit' : 'Add'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{currentStepObj.description}</p>
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (bundleError) {
                              startFlow(flow!);
                            } else {
                              handleSendCurrentStep();
                            }
                          }}
                          disabled={bundleLoading}
                          className={`inline-flex items-center px-3 py-2 text-sm rounded text-white transition-all ${
                            bundleLoading
                              ? 'bg-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer hover:shadow-lg'
                          }`}
                        >
                          {bundleLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Preparing messages...
                            </>
                          ) : bundleError ? (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Retry Preparation
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open WhatsApp (Step {currentStep + 1} of {sequenceSteps.length})
                            </>
                          )}
                        </button>
                        {bundleError && (
                          <p className="text-xs text-red-600 mt-1">{bundleError}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Debug: Loading={bundleLoading ? 'true' : 'false'}, Ready={bundleReady ? 'true' : 'false'}, Error={bundleError ? 'true' : 'false'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {allDone && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                  All steps completed. You can close this window.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between flex-shrink-0 rounded-b-xl">
          {mode === 'sequence' ? (
            <button
              onClick={() => { setMode('choose'); setFlow(null); setSequenceSteps([]); setStepStatus({}); setCurrentStep(0); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={resetAndClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
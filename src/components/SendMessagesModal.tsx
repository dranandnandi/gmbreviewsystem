import React, { useEffect, useMemo, useState } from 'react';
import { X, MessageCircle, Sparkles, Heart, Star, ExternalLink } from 'lucide-react';
import type { Review } from '../types';
import { useStore } from '../store/useStore';
import { generateReviewMessageContent } from '../utils/messageGeneration';

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
  // deprecated props intentionally ignored in manual-only mode
  onSend,
  onDirectSend,
  isLoading = false,
  isDirectSending = false,
  isLoadingTemplates = false,
  hasTemplates = true,
  onEditAIReview,
  isGeneratingAIReview = false
}: SendMessagesModalProps) {
  const { user, reviewRequestTemplates, updateReviewStatus, updateReviewAiFirstMessageStatus } = useStore();
  
  // Manual-only flow state
  type Mode = 'choose' | 'sequence';
  type Flow = 'ai3' | 'simple1';
  const [mode, setMode] = useState<Mode>('choose');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<MessageOption[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepStatus, setStepStatus] = useState<Record<string, 'pending' | 'sent' | 'skipped'>>({});
  const [sendingManually, setSendingManually] = useState<string | null>(null);
  const [justOpenedWA, setJustOpenedWA] = useState<boolean>(false); // retained for possible future auto-advance logic (not currently required)
  // Persist key to store progress per review
  const progressKey = review?.id ? `review_sequence_progress:${review.id}` : undefined;

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

  const generateWhatsAppLink = (messageContent: string, phoneNumber: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const baseUrl = isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/';
    const formattedPhone = `91${phoneNumber}`;
    return `${baseUrl}send?phone=${formattedPhone}&text=${encodeURIComponent(messageContent)}`;
  };

  const openWhatsAppForType = async (messageType: MessageOption['id']) => {
    if (!review || !user) return;
    setSendingManually(messageType);
    try {
      const result = await generateReviewMessageContent({
        review,
        messageType,
        user,
        reviewRequestTemplates
      });
      const whatsappLink = generateWhatsAppLink(result.messageContent, review.contactNumber);
      window.open(whatsappLink, '_blank');
      setJustOpenedWA(true);
    } catch (error) {
      console.error('Error generating message:', error);
      alert(`Failed to generate message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingManually(null);
    }
  };

  // Sequence builders
  const buildAI3 = (): MessageOption[] => [
    optionById('ai_first'),
    optionById('ai_second'),
    optionById('gmb_link')
  ];
  const buildSimple1 = (): MessageOption[] => [optionById('simple_thank_you')];

  const canStartAI3 = useMemo(() => {
    const steps = buildAI3();
    const aiSecond = steps[1];
    const gmb = steps[2];
    // prevent starting if already completed sequence and status is sent
    const alreadyDone = review?.status === 'sent' && review?.hasSequence;
    return !aiSecond.disabled && !gmb.disabled && !alreadyDone; // ai_first may be skipped
  }, [baseOptions, review?.status, review?.hasSequence]);
  const canStartSimple1 = useMemo(() => !buildSimple1()[0].disabled, [baseOptions]);
  // No simple+link option; simple thank you already contains link

  const startFlow = (target: Flow) => {
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
    setMode('sequence');
    setJustOpenedWA(false);
    // persist initial
    try {
      if (progressKey) {
        localStorage.setItem(progressKey, JSON.stringify({ flow: target, stepStatus: initial, ts: Date.now() }));
      }
    } catch {}
  };

  const currentStepObj = sequenceSteps[currentStep];
  const allDone = sequenceSteps.length > 0 && sequenceSteps.every(s => stepStatus[s.id] !== 'pending');

  const handleSendCurrentStep = async () => {
    const step = currentStepObj;
    if (!step) return;
    await openWhatsAppForType(step.id);
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
      try { if (progressKey) localStorage.removeItem(progressKey); } catch {}
    }
  };

  const handleSendSimpleNow = async () => {
    await openWhatsAppForType('simple_thank_you');
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

  const resetAndClose = () => {
    setMode('choose');
    setFlow(null);
    setSequenceSteps([]);
    setCurrentStep(0);
    setStepStatus({});
    setJustOpenedWA(false);
    onClose();
  };

  // Restore progress on open or show completed view if already sent
  useEffect(() => {
    if (!isOpen) return;
    if (!review?.id) return;
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
  }, [isOpen, review?.id, review?.status, review?.hasSequence, baseOptions]);

  if (!isOpen || !review) return null;

  return (
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
                        disabled={!canStartAI3}
                        className="inline-flex items-center px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        title={!canStartAI3 ? 'Requires AI templates and Google review link' : 'Start AI-guided sequence'}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Start AI Guided (3)
                      </button>
                      <span className="text-xs text-gray-600">
                        {review?.status === 'sent' && review?.hasSequence
                          ? 'Sequence already completed'
                          : ((!hasTemplates && 'AI templates missing') || (!hasGMBLink && 'Google review link missing'))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                        disabled={!canStartSimple1}
                        className="inline-flex items-center px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                        title={!canStartSimple1 ? 'Simple Thank You template not available' : 'Open WhatsApp with Simple Thank You'}
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
              {/* Current step card */}
              {!allDone && currentStepObj && (
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
                          onClick={handleSendCurrentStep}
                          disabled={sendingManually === currentStepObj.id}
                          className="inline-flex items-center px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {sendingManually === currentStepObj.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Opening WhatsApp...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open WhatsApp (Step {currentStep + 1} of {sequenceSteps.length})
                            </>
                          )}
                        </button>
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
              onClick={() => { setMode('choose'); setFlow(null); setSequenceSteps([]); setStepStatus({}); setCurrentStep(0); setJustOpenedWA(false); }}
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
  );
}
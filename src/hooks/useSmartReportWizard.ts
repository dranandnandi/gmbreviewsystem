/**
 * Hook to manage Smart Report Wizard visibility
 * Shows wizard on first visit or when WhatsApp is disconnected
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { whatsappApi } from '../services/whatsappApi';

const WIZARD_DISMISSED_KEY = 'smart_report_wizard_dismissed';
const WIZARD_COMPLETED_KEY = 'smart_report_wizard_completed';

interface UseSmartReportWizardReturn {
  showWizard: boolean;
  isWhatsAppConnected: boolean;
  isCheckingConnection: boolean;
  openWizard: () => void;
  closeWizard: () => void;
  markWizardCompleted: () => void;
  resetWizardState: () => void;
  recheckConnection: () => Promise<boolean>;
}

export function useSmartReportWizard(): UseSmartReportWizardReturn {
  const { user } = useStore();
  const [showWizard, setShowWizard] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [hasCheckedInitially, setHasCheckedInitially] = useState(false);

  const checkWhatsAppConnection = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setIsWhatsAppConnected(false);
      setIsCheckingConnection(false);
      return false;
    }

    try {
      setIsCheckingConnection(true);
      const response = await whatsappApi.getStatus({ userId: user.id });

      let isConnected = false;
      if (response.connected !== undefined) {
        isConnected = response.connected;
      } else if (response.data?.sessions?.[0]?.isConnected !== undefined) {
        isConnected = response.data.sessions[0].isConnected;
      } else if (response.isConnected !== undefined) {
        isConnected = response.isConnected;
      }

      setIsWhatsAppConnected(isConnected);
      return isConnected;
    } catch (err) {
      console.error('[useSmartReportWizard] Connection check failed:', err);
      setIsWhatsAppConnected(false);
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [user?.id]);

  // Check connection and determine if wizard should show
  useEffect(() => {
    if (!user?.id || hasCheckedInitially) return;

    const initializeWizard = async () => {
      const isConnected = await checkWhatsAppConnection();
      setHasCheckedInitially(true);

      // Check if user has dismissed or completed the wizard before
      const wizardDismissed = localStorage.getItem(`${WIZARD_DISMISSED_KEY}_${user.id}`);
      const wizardCompleted = localStorage.getItem(`${WIZARD_COMPLETED_KEY}_${user.id}`);

      // Show wizard if:
      // 1. WhatsApp is not connected AND wizard hasn't been dismissed today
      // 2. First time user (never completed wizard)
      const today = new Date().toDateString();
      const wasDismissedToday = wizardDismissed === today;

      if (!isConnected && !wasDismissedToday) {
        setShowWizard(true);
      } else if (!wizardCompleted && !wasDismissedToday) {
        // First time user who hasn't completed wizard
        setShowWizard(true);
      }
    };

    initializeWizard();
  }, [user?.id, hasCheckedInitially, checkWhatsAppConnection]);

  const openWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  const closeWizard = useCallback(() => {
    setShowWizard(false);
    // Mark as dismissed for today so we don't show again immediately
    if (user?.id) {
      localStorage.setItem(`${WIZARD_DISMISSED_KEY}_${user.id}`, new Date().toDateString());
    }
  }, [user?.id]);

  const markWizardCompleted = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`${WIZARD_COMPLETED_KEY}_${user.id}`, 'true');
    }
    setShowWizard(false);
  }, [user?.id]);

  const resetWizardState = useCallback(() => {
    if (user?.id) {
      localStorage.removeItem(`${WIZARD_DISMISSED_KEY}_${user.id}`);
      localStorage.removeItem(`${WIZARD_COMPLETED_KEY}_${user.id}`);
    }
    setHasCheckedInitially(false);
  }, [user?.id]);

  const recheckConnection = useCallback(async () => {
    return await checkWhatsAppConnection();
  }, [checkWhatsAppConnection]);

  return {
    showWizard,
    isWhatsAppConnected,
    isCheckingConnection,
    openWizard,
    closeWizard,
    markWizardCompleted,
    resetWizardState,
    recheckConnection
  };
}

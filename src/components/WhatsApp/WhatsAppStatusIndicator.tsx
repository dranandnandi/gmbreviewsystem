/**
 * Compact WhatsApp Status Indicator
 * Lightweight component for embedding in page headers to show connection status
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../services/whatsappApi';
import { useStore } from '../../store/useStore';

interface WhatsAppStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const WhatsAppStatusIndicator: React.FC<WhatsAppStatusIndicatorProps> = ({
  className = '',
  showLabel = true,
  size = 'sm'
}) => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkStatus();
    } else {
      setStatus('disconnected');
    }
  }, [user?.id]);

  const checkStatus = async () => {
    if (!user?.id) {
      setStatus('disconnected');
      return;
    }

    try {
      setStatus('loading');
      const response = await whatsappApi.getStatus({ userId: user.id });

      let isConnected = false;

      if (response.connected !== undefined) {
        isConnected = response.connected;
      } else if (response.data?.sessions?.[0]?.isConnected !== undefined) {
        isConnected = response.data.sessions[0].isConnected;
      } else if (response.isConnected !== undefined) {
        isConnected = response.isConnected;
      }

      setStatus(isConnected ? 'connected' : 'disconnected');
      setLastChecked(new Date());
    } catch (err) {
      console.error('[WhatsAppIndicator] Status check failed:', err);
      setStatus('error');
    }
  };

  const handleClick = () => {
    navigate('/settings');
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className={`${iconSize} animate-spin text-gray-400`} />,
          label: 'Checking...',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
      case 'connected':
        return {
          icon: <CheckCircle className={`${iconSize} text-green-500`} />,
          label: 'WhatsApp Connected',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'disconnected':
        return {
          icon: <XCircle className={`${iconSize} text-red-500`} />,
          label: 'WhatsApp Disconnected',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className={`${iconSize} text-yellow-500`} />,
          label: 'Status Unknown',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center space-x-1.5 ${padding} rounded-full border ${display.bgColor} ${display.borderColor} ${display.textColor} hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      title={`${display.label}${lastChecked ? ` (checked ${lastChecked.toLocaleTimeString()})` : ''} - Click to manage`}
    >
      <Smartphone className={iconSize} />
      {display.icon}
      {showLabel && (
        <span className={`${textSize} font-medium`}>
          {status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : status === 'loading' ? '...' : 'Unknown'}
        </span>
      )}
    </button>
  );
};

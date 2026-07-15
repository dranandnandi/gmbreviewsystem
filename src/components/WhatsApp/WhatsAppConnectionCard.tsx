/**
 * WhatsApp Connection Management Component
 * Displays QR code for pairing, connection status, and test message interface
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';
import { whatsappApi } from '../../services/whatsappApi';
import { useStore } from '../../store/useStore';
import QRCodeGenerator from 'qrcode';

interface WhatsAppConnectionCardProps {
  className?: string;
}

export const WhatsAppConnectionCard: React.FC<WhatsAppConnectionCardProps> = ({ className = '' }) => {
  const { user } = useStore();
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncingUser, setIsSyncingUser] = useState(false);

  useEffect(() => {
    console.log('[WhatsApp] useEffect triggered, user.id:', user?.id);
    if (user?.id) {
      checkStatus();
    } else {
      console.warn('[WhatsApp] No user ID found');
      setStatus('disconnected');
      setError('No user found. Please login again.');
    }
  }, [user?.id]);

  const checkStatus = async (options: { silent?: boolean } = {}) => {
    if (!user?.id) {
      setStatus('disconnected');
      setError('No user ID found');
      return;
    }

    try {
      if (!options.silent && !qrCodeImage) {
        setStatus('loading');
      }
      setError(null);
      console.log('[WhatsApp] Calling getStatus with userId:', user.id);
      const response = await whatsappApi.getStatus({ userId: user.id });
      console.log('[WhatsApp] Status response:', response);
      
      // Check multiple possible response formats
      let isConnected = false;
      
      // Format 1: response.connected (direct)
      if (response.connected !== undefined) {
        isConnected = response.connected;
      }
      // Format 2: response.data.sessions[0].isConnected (new format)
      else if (response.data?.sessions?.[0]?.isConnected !== undefined) {
        isConnected = response.data.sessions[0].isConnected;
        console.log('[WhatsApp] Phone number:', response.data.sessions[0].phoneNumber);
      }
      // Format 3: response.isConnected
      else if (response.isConnected !== undefined) {
        isConnected = response.isConnected;
      }
      
      setStatus(isConnected ? 'connected' : 'disconnected');
      console.log('[WhatsApp] Status check complete:', isConnected ? 'connected' : 'disconnected');
    } catch (err: any) {
      console.error('Failed to check WhatsApp status:', err);
      setError(err.message || 'Failed to check connection status');
      setStatus('disconnected');
    }
  };

  const fetchQrCode = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      setStatus('loading');
      console.log('[WhatsApp] User clicked Generate QR for userId:', user.id);
      
      // Call QR endpoint which handles connect + normalization
      const response = await getQrWithUserSyncRetry();
      console.log('[WhatsApp] ===== QR RESPONSE =====');
      console.log(JSON.stringify(response, null, 2));
      console.log('[WhatsApp] ============================');
      
      // QR code should be normalized at root level
      const qr = response.qr || response.qrCode;
      
      if (qr) {
        console.log('[WhatsApp] ✅ QR code received! Length:', qr.length);
        setQrCode(qr);
        
        // Check if already a data URL image
        if (qr.startsWith('data:')) {
          console.log('[WhatsApp] QR is already base64 image');
          setQrCodeImage(qr);
        } else {
          // Convert QR string to image using exact OPD app settings
          try {
            const qrImageUrl = await QRCodeGenerator.toDataURL(qr, {
              errorCorrectionLevel: 'M',  // Medium error correction (OPD app setting)
              type: 'image/png',          // PNG format
              margin: 4,                  // 4 units white space (OPD app setting)
              width: 300,                 // 300x300 pixels
              color: {
                dark: '#000000',          // Black squares
                light: '#FFFFFF'          // White background
              }
            });
            setQrCodeImage(qrImageUrl);
            console.log('[WhatsApp] ✅ QR code image generated successfully');
          } catch (qrErr) {
            console.error('[WhatsApp] Failed to generate QR image:', qrErr);
            setError('Failed to generate QR code image');
          }
        }
        
        setStatus('disconnected');
        setError(null);
      } else {
        console.error('[WhatsApp] ❌ No QR code in response');
        console.error('[WhatsApp] Response keys:', Object.keys(response));
        console.error('[WhatsApp] Response message:', response.message);
        
        // Check if session already exists and is restarting/connected
        if (response.success && response.sessionId) {
          console.warn('[WhatsApp] ⚠️ Session already exists - needs disconnect first');
          setError('An existing WhatsApp session is active. Please disconnect first to generate a new QR code.');
          setStatus('disconnected');
        } else {
          setError('QR code not found in response. Please try again.');
          setStatus('disconnected');
        }
      }
    } catch (err: any) {
      console.error('[WhatsApp] ❌ Error:', err);
      setError(err.message || 'Failed to generate QR code. Please try again.');
      setStatus('disconnected');
    }
  };

  const isUserNotFoundError = (value: unknown) => {
    const raw = typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : JSON.stringify(value || '');
    const message = raw.toLowerCase();

    return (
      message.includes('user not found') ||
      message.includes('not found') && message.includes('user') ||
      message.includes('404') && message.includes('user')
    );
  };

  const syncCurrentUserToWhatsAppBackend = async () => {
    if (!user?.id) return;

    setIsSyncingUser(true);
    try {
      await whatsappApi.syncUser(
        user.id,
        user.contactEmail || user.id,
        user.name || user.clinicName || user.id
      );
      console.log('[WhatsApp] User synced to WhatsApp backend, retrying QR generation');
    } finally {
      setIsSyncingUser(false);
    }
  };

  const getQrWithUserSyncRetry = async () => {
    if (!user?.id) {
      throw new Error('No user ID found');
    }

    try {
      const response = await whatsappApi.getQr({ userId: user.id });

      if (isUserNotFoundError(response)) {
        console.warn('[WhatsApp] Backend user missing during QR generation. Syncing user and retrying once.');
        await syncCurrentUserToWhatsAppBackend();
        return await whatsappApi.getQr({ userId: user.id });
      }

      return response;
    } catch (err) {
      if (isUserNotFoundError(err)) {
        console.warn('[WhatsApp] QR generation failed because backend user is missing. Syncing user and retrying once.');
        await syncCurrentUserToWhatsAppBackend();
        return await whatsappApi.getQr({ userId: user.id });
      }

      throw err;
    }
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    
    // User must click to generate QR
    await fetchQrCode();
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      await whatsappApi.disconnect({ userId: user.id });
      setStatus('disconnected');
      setQrCode(null);
      setQrCodeImage(null);
    } catch (err: any) {
      console.error('Failed to disconnect WhatsApp:', err);
      setError(err.message || 'Failed to disconnect');
    }
  };

  const handleRefreshQr = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      setStatus('loading');
      console.log('[WhatsApp] Refreshing QR for userId:', user.id);
      
      // Call refresh-qr endpoint to get a new QR code
      let response;
      try {
        response = await whatsappApi.refreshQr({ userId: user.id });
      } catch (err) {
        if (!isUserNotFoundError(err)) throw err;
        await syncCurrentUserToWhatsAppBackend();
        response = await whatsappApi.refreshQr({ userId: user.id });
      }
      console.log('[WhatsApp] Refresh QR response:', response);
      
      const qr = response.qr || response.qrCode;
      
      if (qr) {
        setQrCode(qr);
        
        if (qr.startsWith('data:')) {
          setQrCodeImage(qr);
        } else {
          // Convert QR string to image
          const imageData = await QRCodeGenerator.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 4,
            width: 300,
            type: 'image/png'
          });
          setQrCodeImage(imageData);
        }
        
        setStatus('disconnected');
      } else {
        throw new Error('No QR code received from server');
      }
    } catch (err: any) {
      console.error('Failed to refresh QR:', err);
      setError(err.message || 'Failed to refresh QR code');
      setStatus('disconnected');
    }
  };

  const handleSendTest = async () => {
    if (!user?.id || !testPhone || !testMessage) return;

    try {
      setError(null);
      setIsSending(true);
      await whatsappApi.sendMessage(
        { phone: testPhone, message: testMessage },
        { userId: user.id }
      );
      alert('Test message sent successfully!');
      setTestPhone('');
      setTestMessage('');
    } catch (err: any) {
      console.error('Failed to send test message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Smartphone className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">WhatsApp Connection</h2>
        </div>
        
        {/* Status Indicator */}
        {status === 'loading' && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking...</span>
          </div>
        )}
        {status === 'connected' && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Connected</span>
          </div>
        )}
        {status === 'disconnected' && (
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Disconnected</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
          {error.includes('existing WhatsApp session') && (
            <button
              onClick={handleRefreshQr}
              className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Get New QR Code
            </button>
          )}
        </div>
      )}

      {/* QR Code Section (when disconnected) */}
      {status === 'disconnected' && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <QrCode className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Scan to Connect</h3>
          </div>
          
          {qrCodeImage ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-4">
              <div className="flex flex-col items-center space-y-4">
                <img 
                  src={qrCodeImage} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48"
                />
                <div className="text-center">
                  <p className="font-medium text-gray-900 mb-1">Scan to link WhatsApp Web</p>
                  <p className="text-sm text-gray-600">
                    Open WhatsApp → Linked devices → Link a device, then scan this QR code
                  </p>
                </div>
                <button
                  onClick={fetchQrCode}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Refresh QR Code
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <button
                onClick={handleConnect}
                disabled={isSyncingUser || status === 'loading'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {isSyncingUser ? 'Syncing User...' : 'Generate QR Code'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connected Actions */}
      {status === 'connected' && (
        <div className="space-y-6">
          {/* Disconnect Button */}
          <div className="flex justify-center">
            <button
              onClick={handleDisconnect}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Disconnect WhatsApp
            </button>
          </div>

          {/* Test Message Section */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Send Test Message</h3>
            <div className="space-y-3">
              <input
                type="tel"
                placeholder="Phone number with country code (e.g., 919876543210)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <textarea
                placeholder="Test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={handleSendTest}
                disabled={!testPhone || !testMessage || isSending}
                className="flex items-center justify-center space-x-2 w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

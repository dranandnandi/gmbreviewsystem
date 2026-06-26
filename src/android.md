# Capacitor Mobile App with Firebase Push Notifications Blueprint

**Version:** 1.0  
**Last Updated:** December 2024  
**Target Platform:** Android (iOS adaptable)  
**Tech Stack:** React + TypeScript + Capacitor + Firebase Cloud Messaging + Supabase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Project Setup](#project-setup)
5. [Firebase Configuration](#firebase-configuration)
6. [Capacitor Integration](#capacitor-integration)
7. [Notification Service Implementation](#notification-service-implementation)
8. [Database Schema](#database-schema)
9. [Backend Integration](#backend-integration)
10. [Android Build Configuration](#android-build-configuration)
11. [Testing & Deployment](#testing--deployment)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Best Practices](#best-practices)

---

## Overview

This blueprint provides a production-ready implementation for integrating Firebase Cloud Messaging (FCM) push notifications into a Capacitor-based mobile application. It covers:

- **Cross-platform notifications** (foreground, background, terminated states)
- **Token management** with automatic refresh and database persistence
- **Rich notifications** with images, actions, and deep linking
- **Multi-user broadcast** capabilities
- **Native Android UI patterns** (status bar, bottom navigation, FAB)
- **Edge-to-edge design** with safe area handling

### Key Features

✅ Firebase Cloud Messaging integration  
✅ Automatic FCM token registration and storage  
✅ Foreground/background notification handling  
✅ Rich media notifications (images, custom data)  
✅ Notification tap handling with deep linking  
✅ Multi-device token management per user  
✅ Broadcast notifications to all users  
✅ Native Android permissions flow  
✅ Immersive status bar (edge-to-edge)  
✅ Bottom navigation + FAB pattern  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Web Application                     │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ NotificationService │→│ Supabase DB │→│ device_tokens │  │
│  └────────────────┘  └─────────────┘  └─────────────────┘  │
│           ↓                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Capacitor Bridge (Native APIs)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Native Android Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ MainActivity │→│ FCM Service  │→│ google-services  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │ Firebase Console  │
                    └──────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  User's Device   │
                    └──────────────────┘
```

### Data Flow

1. **Registration Flow**
   - App launches → Capacitor requests notification permission
   - FCM generates device token → Token sent to NotificationService
   - NotificationService stores token in Supabase `device_tokens` table

2. **Notification Receive Flow**
   - Firebase sends push → Android system displays notification
   - User taps notification → App opens via deep link
   - NotificationService handles tap event → Navigate to relevant screen

3. **Broadcast Flow**
   - Admin triggers broadcast → Backend fetches all active tokens
   - Backend sends to FCM API → FCM delivers to all devices
   - Invalid tokens marked inactive in database

---

## Prerequisites

### Required Accounts & Tools

- [ ] **Firebase Console** account ([console.firebase.google.com](https://console.firebase.google.com))
- [ ] **Google Cloud Console** access (for FCM V1 API)
- [ ] **Supabase** project ([supabase.com](https://supabase.com))
- [ ] **Node.js** 18+ and npm/yarn
- [ ] **Android Studio** (for Android builds)
- [ ] **Java JDK** 17+ (for Gradle builds)

### Development Environment

```bash
# Verify installations
node -v        # Should be 18+
npm -v         # Should be 9+
java -version  # Should be 17+
```

### Install Capacitor CLI

```bash
npm install -g @capacitor/cli
```

---

## Project Setup

### 1. Create React + TypeScript Project

```bash
# Using Vite (recommended)
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install

# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init
```

**Configure `capacitor.config.ts`:**

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.yourapp',
  appName: 'Your App Name',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### 2. Install Required Dependencies

```bash
# Capacitor core + Android platform
npm install @capacitor/android

# Push notifications plugin
npm install @capacitor/push-notifications

# Local notifications (for foreground display)
npm install @capacitor/local-notifications

# Firebase JavaScript SDK (optional, for web testing)
npm install firebase

# Supabase client
npm install @supabase/supabase-js
```

### 3. Add Android Platform

```bash
npx cap add android
```

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name (e.g., `my-app-notifications`)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Add Android App to Firebase

1. In Firebase Console, click **⚙️ → Project settings**
2. Scroll to **"Your apps"** → Click **Android icon**
3. Register app:
   - **Android package name**: `com.yourcompany.yourapp` (must match `capacitor.config.ts`)
   - **App nickname**: `My App Android`
   - **Debug signing certificate SHA-1**: (get from step below)

#### Get Debug SHA-1 Fingerprint

```bash
# Windows
cd android
./gradlew signingReport

# macOS/Linux
cd android
./gradlew signingReport
```

Copy the **SHA-1** from the `debug` variant and paste into Firebase Console.

### Step 3: Download `google-services.json`

1. Click **"Download google-services.json"**
2. Place file at: `android/app/google-services.json`

**Important:** Never commit this file to version control. Add to `.gitignore`:

```bash
echo "android/app/google-services.json" >> .gitignore
```

### Step 4: Enable Firebase Cloud Messaging API (V1)

1. Firebase Console → **Project settings** → **Cloud Messaging** tab
2. Under **"Cloud Messaging API (V1)"**, click **"Manage"**
3. Enable the API in Google Cloud Console
4. Return to Firebase Console and verify it shows **"Enabled"**

### Step 5: Create Service Account Key (for backend)

1. Firebase Console → **Project settings** → **Service accounts** tab
2. Click **"Generate new private key"**
3. Save the JSON file securely (e.g., `firebase-service-account.json`)
4. **Never** commit this to version control

---

## Capacitor Integration

### 1. Configure Android Manifest

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourcompany.yourapp">

    <!-- Internet permission (required for FCM) -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- Post notifications permission (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    
    <!-- Optional: Camera/Microphone for features -->
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    
    <!-- Optional: Location for geofencing notifications -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>

            <!-- Deep links for notification taps -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="myapp"/>
            </intent-filter>
        </activity>

        <!-- Firebase Messaging Service (auto-added by plugin, DO NOT manually add) -->
        <!-- The Capacitor plugin handles this automatically -->

        <!-- Notification Channel Metadata -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="@string/default_notification_channel_id" />
        
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_icon_config_sample" />
        
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />
    </application>
</manifest>
```

**Add notification channel ID to `android/app/src/main/res/values/strings.xml`:**

```xml
<resources>
    <string name="app_name">Your App</string>
    <string name="title_activity_main">Your App</string>
    <string name="package_name">com.yourcompany.yourapp</string>
    <string name="default_notification_channel_id">fcm_default_channel</string>
</resources>
```

### 2. Configure Gradle

**File:** `android/app/build.gradle`

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // Add this line

android {
    namespace "com.yourcompany.yourapp"
    compileSdk 34

    defaultConfig {
        applicationId "com.yourcompany.yourapp"
        minSdk 23
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            // Sign with your keystore
            signingConfig signingConfigs.release
        }
    }

    // Signing configs (for release builds)
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "your-keystore.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your-password"
            keyAlias System.getenv("KEY_ALIAS") ?: "your-alias"
            keyPassword System.getenv("KEY_PASSWORD") ?: "your-key-password"
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')

    // Firebase BoM (Bill of Materials)
    implementation platform('com.google.firebase:firebase-bom:34.6.0')
    
    // Firebase Messaging
    implementation 'com.google.firebase:firebase-messaging'
    
    // Google Play Services (required by Firebase)
    implementation 'com.google.android.gms:play-services-base:18.5.0'
}

// Apply Google Services plugin (must be at bottom)
apply plugin: 'com.google.gms.google-services'
```

**File:** `android/build.gradle`

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.3'
        classpath 'com.google.gms:google-services:4.4.2' // Add this line
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

### 3. Configure MainActivity

**File:** `android/app/src/main/java/com/yourcompany/yourapp/MainActivity.java`

```java
package com.yourcompany.yourapp;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Log FCM token for debugging
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w("FCM", "Fetching FCM token failed", task.getException());
                    return;
                }
                String token = task.getResult();
                Log.d("FCM", "========================================");
                Log.d("FCM", "FCM Token: " + token);
                Log.d("FCM", "========================================");
            });
    }
}
```

### 4. Sync Capacitor

```bash
npm run build
npx cap sync android
```

---

## Notification Service Implementation

### File Structure

```
src/
├── services/
│   ├── NotificationService.ts       # Main notification logic
│   └── supabaseClient.ts            # Supabase client setup
├── components/
│   ├── NotificationModal.tsx        # Rich notification display
│   └── App.tsx                      # Root component
└── utils/
    └── mobileApp.ts                 # Capacitor initialization
```

### 1. Supabase Client Setup

**File:** `src/services/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. NotificationService Implementation

**File:** `src/services/NotificationService.ts`

```typescript
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Dialog } from '@capacitor/dialog';
import { supabase } from './supabaseClient';

interface NotificationData {
  title?: string;
  body?: string;
  image?: string;
  type?: string;
  taskId?: string;
  conversationId?: string;
  [key: string]: any;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize push notifications
   * Call this once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 NotificationService already initialized');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Push notifications only available on native platforms');
      return;
    }

    try {
      console.log('🔔 Initializing NotificationService...');

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      console.log('📱 Permission status:', permResult.receive);

      if (permResult.receive === 'granted') {
        // Register with FCM
        await PushNotifications.register();
        console.log('✅ Registered for push notifications');

        // Setup listeners
        this.setupListeners();
        this.isInitialized = true;
      } else {
        console.warn('⚠️ Push notification permission denied');
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  /**
   * Setup push notification event listeners
   */
  private setupListeners(): void {
    // Called when FCM token is generated
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('📲 FCM Token received:', token.value);
      this.saveTokenToDatabase(token.value);
    });

    // Called when registration fails
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ FCM Registration error:', error);
    });

    // Called when notification is received (foreground)
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('📬 Notification received (foreground):', notification);
        this.handleForegroundNotification(notification);
      }
    );

    // Called when notification is tapped
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('👆 Notification tapped:', notification);
        this.handleNotificationTap(notification);
      }
    );
  }

  /**
   * Save FCM token to Supabase database
   */
  private async saveTokenToDatabase(fcmToken: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ User not logged in, cannot save FCM token');
        return;
      }

      // Get device info
      const deviceInfo = {
        model: Capacitor.getPlatform(),
        platform: Capacitor.getPlatform(),
        osVersion: Capacitor.getPlatform(),
      };

      // Call upsert function
      const { data, error } = await supabase.rpc('upsert_device_token', {
        p_user_id: user.id,
        p_fcm_token: fcmToken,
        p_device_info: deviceInfo,
        p_platform: 'android',
      });

      if (error) {
        console.error('❌ Failed to save FCM token:', error);
        
        // Fallback: direct insert
        const { error: insertError } = await supabase
          .from('device_tokens')
          .upsert({
            user_id: user.id,
            fcm_token: fcmToken,
            device_info: deviceInfo,
            platform: 'android',
            is_active: true,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: 'fcm_token'
          });

        if (insertError) {
          console.error('❌ Fallback insert also failed:', insertError);
        } else {
          console.log('✅ FCM token saved (fallback)');
        }
      } else {
        console.log('✅ FCM token saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  private async handleForegroundNotification(
    notification: PushNotificationSchema
  ): Promise<void> {
    console.log('📬 Handling foreground notification');

    const { title, body, data } = notification;
    const imageUrl = data?.image || data?.imageUrl;

    try {
      // Show local notification with the original data
      const localNotifId = Math.floor(Math.random() * 100000);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || 'New Notification',
            body: body || '',
            id: localNotifId,
            extra: {
              ...data,
              originalTitle: title,
              originalBody: body,
              image: imageUrl,
            },
            largeIcon: imageUrl,
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });

      console.log('✅ Local notification scheduled');
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
    }
  }

  /**
   * Handle notification tap (from system tray or local notification)
   */
  private async handleNotificationTap(
    notification: ActionPerformed
  ): Promise<void> {
    console.log('👆 Handling notification tap');
    const data: NotificationData = notification.notification.data || {};

    // Extract title/body from multiple possible locations
    const title = 
      data.title || 
      data.originalTitle || 
      notification.notification.title || 
      '';
    
    const body = 
      data.body || 
      data.originalBody || 
      notification.notification.body || 
      '';
    
    const image = data.image || data.imageUrl || '';

    console.log('📦 Notification data:', { title, body, image, ...data });

    // Show rich notification modal if we have title/body
    if (title.trim() || body.trim()) {
      this.dispatchNotificationEvent({
        title,
        body,
        image,
        data,
      });
    } else {
      // Generic notification
      await Dialog.alert({
        title: 'Notification received!',
        message: 'You tapped a notification. The content will be displayed once available.',
      });
    }

    // Handle specific notification types
    this.handleNotificationType(data);
  }

  /**
   * Dispatch custom event for app to listen to
   */
  private dispatchNotificationEvent(data: NotificationData): void {
    const event = new CustomEvent('showNotificationModal', {
      detail: data,
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle different notification types
   */
  private handleNotificationType(data: NotificationData): void {
    const { type, taskId, conversationId } = data;

    switch (type) {
      case 'task_assigned':
      case 'task_overdue':
      case 'task_reminder':
        if (taskId) {
          // Navigate to task detail
          window.location.href = `#/tasks/${taskId}`;
        }
        break;

      case 'conversation':
        if (conversationId) {
          // Navigate to conversation
          window.location.href = `#/conversations/${conversationId}`;
        }
        break;

      case 'attendance_reminder':
        // Navigate to attendance page
        window.location.href = '#/attendance';
        break;

      default:
        console.log('ℹ️ Unknown notification type:', type);
    }
  }

  /**
   * Get current FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      console.log('📮 Delivered notifications:', result);
      return null; // Token retrieval handled by registration listener
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  /**
   * Clear all delivered notifications
   */
  async clearNotifications(): Promise<void> {
    try {
      await PushNotifications.removeAllDeliveredNotifications();
      console.log('🗑️ All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }
}

export default NotificationService.getInstance();
```

### 3. NotificationModal Component

**File:** `src/components/NotificationModal.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface NotificationModalProps {
  onClose: () => void;
}

interface NotificationData {
  title: string;
  body: string;
  image?: string;
  data?: Record<string, any>;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ onClose }) => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  useEffect(() => {
    const handleShowModal = (event: CustomEvent<NotificationData>) => {
      console.log('🔔 NotificationModal: Received event', event.detail);
      setNotification(event.detail);
    };

    window.addEventListener('showNotificationModal', handleShowModal as EventListener);

    return () => {
      window.removeEventListener('showNotificationModal', handleShowModal as EventListener);
    };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Close Button */}
        <button
          onClick={() => {
            setNotification(null);
            onClose();
          }}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>

        {/* Image (if present) */}
        {notification.image && (
          <img
            src={notification.image}
            alt="Notification"
            className="h-48 w-full rounded-t-lg object-cover"
          />
        )}

        {/* Content */}
        <div className="p-6">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            {notification.title}
          </h2>
          <p className="text-gray-700">{notification.body}</p>

          {/* Debug Info (optional, remove in production) */}
          {notification.data && Object.keys(notification.data).length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                Debug Info
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Action Button */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => {
              setNotification(null);
              onClose();
            }}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
```

### 4. Initialize in App.tsx

**File:** `src/App.tsx`

```typescript
import React, { useEffect } from 'react';
import NotificationService from './services/NotificationService';
import NotificationModal from './components/NotificationModal';

function App() {
  const [showNotificationModal, setShowNotificationModal] = React.useState(false);

  useEffect(() => {
    // Initialize notification service
    NotificationService.initialize();

    // Listen for notification modal events
    const handleShowModal = () => setShowNotificationModal(true);
    window.addEventListener('showNotificationModal', handleShowModal);

    return () => {
      window.removeEventListener('showNotificationModal', handleShowModal);
    };
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
      
      {/* Notification Modal */}
      {showNotificationModal && (
        <NotificationModal onClose={() => setShowNotificationModal(false)} />
      )}
    </div>
  );
}

export default App;
```

---

## Database Schema

### SQL Migration File

**File:** `supabase/migrations/create_device_tokens_table.sql`

```sql
-- Device Tokens Table for FCM Push Notifications
-- Run this in Supabase SQL Editor

-- Create table
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX idx_device_tokens_fcm_token ON device_tokens(fcm_token);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tokens" ON device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_device_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_tokens_timestamp
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_token_timestamp();

-- Upsert function
CREATE OR REPLACE FUNCTION upsert_device_token(
  p_user_id UUID,
  p_fcm_token TEXT,
  p_device_info JSONB DEFAULT '{}',
  p_platform TEXT DEFAULT 'android'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO device_tokens (user_id, fcm_token, device_info, platform, is_active, last_used_at)
  VALUES (p_user_id, p_fcm_token, p_device_info, p_platform, true, NOW())
  ON CONFLICT (fcm_token) 
  DO UPDATE SET 
    user_id = EXCLUDED.user_id,
    device_info = EXCLUDED.device_info,
    platform = EXCLUDED.platform,
    is_active = true,
    last_used_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_device_token TO authenticated;

-- View for active tokens
CREATE OR REPLACE VIEW active_device_tokens AS
SELECT 
  dt.id,
  dt.user_id,
  dt.fcm_token,
  dt.platform,
  dt.device_info,
  dt.last_used_at,
  u.email as user_email
FROM device_tokens dt
LEFT JOIN auth.users u ON dt.user_id = u.id
WHERE dt.is_active = true;

GRANT SELECT ON active_device_tokens TO authenticated;
```

---

## Backend Integration

### Node.js Script to Send Notifications

**File:** `send-notification-to-all.js`

```javascript
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

// Initialize Supabase (with service_role key for admin access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Send push notification to all registered users
 */
async function sendNotificationToAll(title, body, imageUrl = null) {
  try {
    console.log('📡 Fetching all active device tokens...');

    // Fetch all active tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('fcm_token, user_id, id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No active device tokens found');
      return;
    }

    console.log(`📱 Found ${tokens.length} active tokens`);

    // Prepare FCM message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        title: title,
        body: body,
        ...(imageUrl && { image: imageUrl }),
      },
      ...(imageUrl && {
        android: {
          notification: {
            imageUrl: imageUrl,
          },
        },
      }),
    };

    // Send to all tokens
    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      try {
        await getMessaging().send({
          ...message,
          token: token.fcm_token,
        });
        
        successCount++;
        console.log(`✅ Sent to token: ${token.fcm_token.substring(0, 20)}...`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed for token: ${token.fcm_token.substring(0, 20)}...`, error.code);

        // Mark token as inactive if it's invalid
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('id', token.id);
          
          console.log(`🗑️ Marked token as inactive`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
  }
}

// CLI usage
const [title, body, imageUrl] = process.argv.slice(2);

if (!title || !body) {
  console.log('Usage: node send-notification-to-all.js "Title" "Body" "ImageURL (optional)"');
  process.exit(1);
}

sendNotificationToAll(title, body, imageUrl);
```

**Usage:**

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Send notification
node send-notification-to-all.js "New Update!" "Check out the latest features" "https://example.com/image.jpg"
```

---

## Android Build Configuration

### 1. Keystore Generation (for release builds)

```bash
# Generate keystore
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Get SHA-1 and SHA-256 fingerprints
keytool -list -v -keystore my-release-key.jks -alias my-key-alias
```

**Add release SHA-1 to Firebase Console:**
1. Firebase Console → Project Settings → Your Android App
2. Click "Add fingerprint"
3. Paste SHA-1
4. Re-download `google-services.json`

### 2. Gradle Signing Configuration

**File:** `android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "../my-release-key.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "password"
            keyAlias System.getenv("KEY_ALIAS") ?: "my-key-alias"
            keyPassword System.getenv("KEY_PASSWORD") ?: "password"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build Commands

```bash
# Debug APK
cd android
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Release AAB (for Play Store)
./gradlew bundleRelease
```

**Output locations:**
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Testing & Deployment

### Testing Checklist

- [ ] **Permissions**
  - [ ] Notification permission requested on first launch
  - [ ] Permission denied/granted handled gracefully

- [ ] **Token Registration**
  - [ ] FCM token logged in Logcat
  - [ ] Token saved to Supabase `device_tokens` table
  - [ ] Token updates on app reinstall

- [ ] **Foreground Notifications**
  - [ ] Notification shown as local notification
  - [ ] Title, body, and image displayed correctly
  - [ ] Tapping opens notification modal

- [ ] **Background Notifications**
  - [ ] System notification displayed
  - [ ] Tapping opens app and shows content
  - [ ] Deep linking works (if applicable)

- [ ] **Rich Notifications**
  - [ ] Images load and display
  - [ ] Custom data passed correctly
  - [ ] Notification actions work (if implemented)

- [ ] **Broadcast**
  - [ ] All users receive notification
  - [ ] Invalid tokens marked inactive
  - [ ] Performance acceptable for large user base

### Send Test Notification from Firebase Console

1. Firebase Console → **Cloud Messaging**
2. Click **"Send your first message"**
3. Enter notification title and text
4. Click **"Send test message"**
5. Paste FCM token (from Logcat)
6. Click **"Test"**

### Deploy to Google Play Console

1. **Create App Listing**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Fill in app details, screenshots, descriptions

2. **Upload AAB**
   - Go to **Release** → **Production** → **Create new release**
   - Upload `app-release.aab`
   - Add release notes

3. **Submit for Review**
   - Complete all required sections
   - Submit for review (can take 1-7 days)

---

## Troubleshooting Guide

### Issue 1: `ClassNotFoundException: MessagingService`

**Symptom:** App crashes with `ClassNotFoundException: com.getcapacitor.plugin.pushnotifications.MessagingService`

**Cause:** Manually added `<service>` tag in `AndroidManifest.xml` with wrong class name

**Solution:**
1. Remove any manually added `<service>` tags for push notifications
2. The Capacitor plugin auto-generates the correct service
3. Rebuild: `npx cap sync android`

---

### Issue 2: No FCM Token Generated

**Symptom:** No token appears in Logcat, `registration` listener never fires

**Causes:**
- `google-services.json` missing or incorrect
- Firebase Cloud Messaging API not enabled
- SHA-1 fingerprint not added to Firebase

**Solution:**
1. Verify `google-services.json` is in `android/app/`
2. Enable FCM API in Firebase Console
3. Add debug SHA-1 fingerprint
4. Re-download `google-services.json`
5. Clean build: `cd android && ./gradlew clean && ./gradlew assembleDebug`

---

### Issue 3: "No listeners found for event"

**Symptom:** Notification received but modal doesn't show, logs say "No listeners found"

**Cause:** NotificationService not initialized before notification arrives

**Solution:**
1. Call `NotificationService.initialize()` in `App.tsx` `useEffect`
2. Ensure it runs before user logs in
3. Add `await` to ensure async initialization completes

---

### Issue 4: Title/Body Empty When Tapped

**Symptom:** Notification shows correctly in system tray, but tapping it shows empty alert

**Cause:** FCM doesn't pass `notification` payload to app when tapped from background—only `data` payload

**Solution:**
- Always include title/body in `data` payload when sending:
  ```json
  {
    "notification": {
      "title": "Hello",
      "body": "World"
    },
    "data": {
      "title": "Hello",
      "body": "World",
      "image": "https://..."
    }
  }
  ```

---

### Issue 5: Image Not Showing in Notification

**Symptom:** Image URL sent but not displayed in notification

**Causes:**
- Image URL not in `data.image` or `android.notification.imageUrl`
- Image too large (max 1MB)
- Image format not supported (use JPEG/PNG)

**Solution:**
1. Include image in both places:
   ```json
   {
     "data": {
       "image": "https://example.com/image.jpg"
     },
     "android": {
       "notification": {
         "imageUrl": "https://example.com/image.jpg"
       }
     }
   }
   ```
2. Optimize images (compress, resize to 512x512 or smaller)

---

### Issue 6: Notification Permission Not Requested

**Symptom:** App doesn't ask for notification permission on Android 13+

**Cause:** Missing `POST_NOTIFICATIONS` permission in `AndroidManifest.xml`

**Solution:**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

---

### Issue 7: Invalid Token / Token Not Registered

**Symptom:** Backend send fails with "invalid-registration-token"

**Causes:**
- Token expired or revoked
- App uninstalled and reinstalled
- User cleared app data

**Solution:**
1. Mark token as `is_active = false` in database
2. App will generate new token on next launch
3. Implement token refresh logic:
   ```typescript
   PushNotifications.addListener('registration', async (token) => {
     await saveTokenToDatabase(token.value);
   });
   ```

---

## Best Practices

### Security

1. **Never commit sensitive files:**
   - `google-services.json`
   - `firebase-service-account.json`
   - Keystore files (`.jks`, `.keystore`)
   - `.env` files

2. **Use environment variables:**
   ```bash
   # .env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # Backend only (never expose to client)
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Enable RLS (Row Level Security):**
   - Users can only access their own tokens
   - Use service_role key only in backend/edge functions

4. **Validate notification data:**
   ```typescript
   const sanitizedTitle = DOMPurify.sanitize(data.title);
   const sanitizedBody = DOMPurify.sanitize(data.body);
   ```

### Performance

1. **Lazy load NotificationModal:**
   ```typescript
   const NotificationModal = React.lazy(() => import('./components/NotificationModal'));
   ```

2. **Batch notifications:**
   - Don't send individual requests for each user
   - Use FCM's multicast or topic messaging for large audiences

3. **Clean up old tokens:**
   ```sql
   -- Run this periodically
   DELETE FROM device_tokens 
   WHERE last_used_at < NOW() - INTERVAL '90 days'
   AND is_active = false;
   ```

### User Experience

1. **Request permission at the right time:**
   - Don't ask immediately on app launch
   - Show value proposition first
   - Ask when user opts in to notifications feature

2. **Provide notification settings:**
   ```typescript
   <button onClick={() => {
     // Open app settings
     window.location.href = 'app-settings:';
   }}>
     Manage Notifications
   </button>
   ```

3. **Handle permission denied gracefully:**
   ```typescript
   if (permResult.receive === 'denied') {
     showToast('Enable notifications in Settings to receive updates');
   }
   ```

4. **Show loading states:**
   ```typescript
   const [isRegistering, setIsRegistering] = useState(false);
   
   if (isRegistering) {
     return <Spinner />;
   }
   ```

### Testing

1. **Test all states:**
   - App in foreground
   - App in background
   - App terminated
   - Permission granted/denied
   - Network offline

2. **Test on real devices:**
   - Different Android versions (API 23-34)
   - Different manufacturers (Samsung, Pixel, OnePlus)
   - Different screen sizes

3. **Log everything during development:**
   ```typescript
   console.log('📱 [NotificationService]', event, data);
   ```

4. **Use Firebase Console for quick tests:**
   - Test single device notifications
   - Verify token validity
   - Check delivery stats

### Maintenance

1. **Monitor token lifecycle:**
   - Track token generation rate
   - Alert on high failure rates
   - Auto-cleanup invalid tokens

2. **Version notifications:**
   ```typescript
   const notification = {
     data: {
       version: '1.0',
       type: 'task_reminder',
       // ... other data
     }
   };
   ```

3. **A/B test notification content:**
   - Test different titles/bodies
   - Measure engagement rates
   - Optimize for CTR

4. **Keep dependencies updated:**
   ```bash
   npm update @capacitor/push-notifications
   npm update firebase
   ```

---

## Appendix: Complete File Checklist

### React/TypeScript Files

```
src/
├── services/
│   ├── NotificationService.ts          ✅ Main notification logic
│   └── supabaseClient.ts               ✅ Supabase client
├── components/
│   ├── NotificationModal.tsx           ✅ Rich notification display
│   └── App.tsx                         ✅ Root component
├── utils/
│   └── mobileApp.ts                    ✅ Capacitor init (optional)
└── types/
    └── notifications.ts                ✅ TypeScript types (optional)
```

### Android Files

```
android/
├── app/
│   ├── google-services.json            ✅ Firebase config (DO NOT COMMIT)
│   ├── src/main/
│   │   ├── AndroidManifest.xml         ✅ Permissions & metadata
│   │   ├── java/.../MainActivity.java  ✅ FCM token logging
│   │   └── res/
│   │       ├── values/
│   │       │   ├── strings.xml         ✅ Notification channel ID
│   │       │   └── colors.xml          ✅ Notification color
│   │       └── drawable/
│   │           └── ic_stat_icon_*.png  ✅ Notification icon
│   └── build.gradle                    ✅ Dependencies & signing
├── build.gradle                        ✅ Google Services plugin
└── my-release-key.jks                  ✅ Release keystore (DO NOT COMMIT)
```

### Backend Files

```
backend/
├── send-notification-to-all.js         ✅ Broadcast script
├── firebase-service-account.json       ✅ Service account (DO NOT COMMIT)
└── .env                                ✅ Environment variables (DO NOT COMMIT)
```

### Database Files

```
supabase/
└── migrations/
    └── create_device_tokens_table.sql  ✅ Database schema
```

### Config Files

```
project-root/
├── capacitor.config.ts                 ✅ Capacitor config
├── .env                                ✅ Environment variables
├── .gitignore                          ✅ Ignore sensitive files
└── package.json                        ✅ Dependencies
```

---

## Support & Resources

### Official Documentation

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Android Notification Guide](https://developer.android.com/develop/ui/views/notifications)

### Community

- [Capacitor Discord](https://discord.gg/UPYYRhtyzp)
- [Ionic Forum](https://forum.ionicframework.com/)
- [Stack Overflow - capacitor](https://stackoverflow.com/questions/tagged/capacitor)

### Tools

- [FCM HTTP v1 API Tester](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Postman Collection for FCM](https://www.postman.com/firebase)
- [Android Logcat Viewer](https://developer.android.com/studio/debug/am-logcat)

---

## Changelog

- **v1.0** (Dec 2024) - Initial blueprint
  - Firebase FCM integration
  - Capacitor 7.x compatibility
  - Supabase token storage
  - Rich notifications with images
  - Broadcast messaging
  - Android-first implementation

---

## License

This blueprint is provided as-is for educational and development purposes. Adapt it to your specific needs and ensure compliance with relevant privacy laws (GDPR, CCPA, etc.) when handling user tokens and sending notifications.

---

**End of Blueprint** 🎉

For questions or improvements, please refer to the support resources above or consult the official documentation.
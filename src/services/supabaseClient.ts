import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'clinic-management-system'
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to check if error is network-related
const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('fetch') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.name === 'TypeError'
  );
};

// Helper function to wait for a specified delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initializeSupabase = async (): Promise<void> => {
  if (connectionAttempts >= MAX_RETRIES) {
    throw new Error('Failed to connect to database after multiple attempts. Please check your internet connection and try again.');
  }

  try {
    console.log(`Attempting to connect to Supabase (attempt ${connectionAttempts + 1}/${MAX_RETRIES})...`);
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase initialization error:', error);
      
      if (isNetworkError(error)) {
        connectionAttempts++;
        if (connectionAttempts < MAX_RETRIES) {
          console.log(`Network error detected. Retrying in ${RETRY_DELAY}ms...`);
          await delay(RETRY_DELAY);
          return initializeSupabase();
        }
      }
      
      throw error;
    }

    console.log('Supabase connected successfully');
    connectionAttempts = 0; // Reset on successful connection
  } catch (error) {
    console.error('Failed to initialize Supabase connection:', error);
    
    if (isNetworkError(error)) {
      connectionAttempts++;
      if (connectionAttempts < MAX_RETRIES) {
        console.log(`Network error detected. Retrying in ${RETRY_DELAY}ms...`);
        await delay(RETRY_DELAY);
        return initializeSupabase();
      }
    }
    
    connectionAttempts++;
    throw error;
  }
};

// Enhanced query wrapper with retry logic
export const executeWithRetry = async <T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  maxRetries: number = 2
): Promise<{ data: T; error: any }> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error && isNetworkError(result.error)) {
        lastError = result.error;
        if (attempt < maxRetries) {
          console.log(`Network error on attempt ${attempt + 1}, retrying...`);
          await delay(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (isNetworkError(error) && attempt < maxRetries) {
        console.log(`Network error on attempt ${attempt + 1}, retrying...`);
        await delay(1000 * (attempt + 1)); // Exponential backoff
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Initialize on import with better error handling
initializeSupabase().catch((error) => {
  console.error('Initial Supabase connection failed:', error);
  
  if (isNetworkError(error)) {
    console.warn('Network connectivity issues detected. Some features may not work until connection is restored.');
  }
});
/**
 * Returns the base URL for API requests, automatically handling development vs production environments
 */
export const getApiBaseUrl = (): string => {
  // Use the global API base URL if available
  if (typeof window !== 'undefined' && (window as any).API_BASE_URL !== undefined) {
    console.log('🌐 Using global API_BASE_URL:', (window as any).API_BASE_URL);
    return (window as any).API_BASE_URL;
  }

  // 🔍 COMPREHENSIVE DEBUG INFO
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const isProd = import.meta.env.PROD;
  const isDev = import.meta.env.DEV;
  const mode = import.meta.env.MODE;

  console.log('🔍 DETAILED Environment Detection:', {
    hostname,
    protocol,
    isProd,
    isDev,
    mode,
    'import.meta.env': import.meta.env,
    'window.location': typeof window !== 'undefined' ? window.location : 'undefined'
  });

  // Fall back to environment-specific logic
  if (isProd) {
    console.log('✅ Production mode detected');

    console.log('🔍 Hostname checks:', {
      hostname,
      'includes upsun-deployment': hostname.includes('upsun-deployment'),
      'includes .platformsh.site': hostname.includes('.platformsh.site'),
      'starts with api.': hostname.startsWith('api.')
    });

    // 🚨 SPECIFIC FIX FOR UPSUN DEPLOYMENT 🚨
    // Based on Upsun config: frontend is on {default}, backend is on api.{default}
    if (hostname.includes('upsun-deployment') ||
        hostname.includes('.platformsh.site') ||
        hostname.includes('.upsun.app') ||
        hostname.includes('.upsun.io')) {
      console.log('🎯 Upsun domain detected!');

      // If we're on the frontend domain, we need to call the API subdomain
      let apiHostname = hostname;

      // If we're NOT already on the api subdomain, add it
      if (!hostname.startsWith('api.')) {
        apiHostname = `api.${hostname}`;
        console.log('📍 Adding api subdomain:', { original: hostname, modified: apiHostname });
      } else {
        console.log('📍 Already on api subdomain:', hostname);
      }

      const apiUrl = `${protocol}//${apiHostname}`;
      console.log('✅ Using Upsun API URL (with api subdomain):', apiUrl);
      console.log('📍 Frontend hostname:', hostname);
      console.log('📍 Backend hostname:', apiHostname);
      return apiUrl;
    }

    // For other production environments, use same domain
    console.log('🌐 Non-Upsun production environment detected');
    const apiUrl = `${protocol}//${hostname}`;
    console.log('✅ Using production API URL:', apiUrl);
    return apiUrl;
  }

  console.log('🛠️ Development mode detected');
  console.log('🔍 Window location details:', {
    port: typeof window !== 'undefined' ? window.location.port : 'undefined',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
    href: typeof window !== 'undefined' ? window.location.href : 'undefined'
  });

  // In development, try to use the direct backend URL if proxy is not working
  // Check if we're running on localhost:5179 (Vite dev server)
  if (typeof window !== 'undefined' && window.location.port === '5179') {
    // Use direct backend URL to bypass potential proxy issues
    console.log('✅ Using development direct API URL: http://127.0.0.1:8000');
    return 'http://127.0.0.1:8000';
  }

  // Force direct backend URL for development to fix transaction issues
  console.log('✅ Using development direct API URL: http://127.0.0.1:8000 (forced)');
  return 'http://127.0.0.1:8000';
};

/**
 * Creates a complete API URL by combining the base URL with the endpoint
 */
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with /api/
  const formattedEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`;
  const fullUrl = `${baseUrl}${formattedEndpoint}`;

  console.log('🔗 API URL Created:', { endpoint, baseUrl, fullUrl });
  return fullUrl;
};

/**
 * Wrapper for the fetch API that automatically adds the API base URL and auth token
 * Now with enhanced error handling, cloud environment compatibility, and smart fallback
 */
export const apiFetch = (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = createApiUrl(endpoint);
  console.log('📡 API Fetch:', { endpoint, url, method: options?.method || 'GET' });

  // Get auth token from localStorage if available
  const token = localStorage.getItem('authToken');

  // Prepare headers with minimal requirements for testing
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    // Basic headers for cross-origin compatibility
    'Accept': 'application/json',
    // Only add Content-Type if it's not FormData (for file uploads)
    ...(!options?.body || !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {})
  };

  const fetchOptions = {
    ...options,
    headers,
    // Try without credentials first for maximum compatibility
    credentials: 'omit' as RequestCredentials,
    // Set mode to handle CORS more permissively
    mode: 'cors' as RequestMode
  };

  console.log('📤 Fetch Options:', { url, headers, method: options?.method });

  // Smart fallback function
  const tryFallbackUrl = async (originalError: any): Promise<Response> => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

    // Only try fallback for Upsun deployments and if we're not already on API subdomain
    if ((hostname.includes('upsun-deployment') ||
         hostname.includes('.platformsh.site') ||
         hostname.includes('.upsun.app') ||
         hostname.includes('.upsun.io')) &&
        !hostname.startsWith('api.')) {
      const fallbackHostname = `api.${hostname}`;
      const fallbackBaseUrl = `${protocol}//${fallbackHostname}`;
      const formattedEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint.replace(/^\//, '')}`;
      const fallbackUrl = `${fallbackBaseUrl}${formattedEndpoint}`;

      console.log('🔄 Trying fallback URL with API subdomain:', fallbackUrl);

      try {
        const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
        console.log('📥 Fallback response received:', {
          status: fallbackResponse.status,
          statusText: fallbackResponse.statusText,
          contentType: fallbackResponse.headers.get('content-type'),
          url: fallbackResponse.url
        });

        // If the fallback worked (got JSON), update the global API base URL for future requests
        if (fallbackResponse.ok && fallbackResponse.headers.get('content-type')?.includes('application/json')) {
          console.log('✅ Fallback successful! Setting global API base URL:', fallbackBaseUrl);
          (window as any).API_BASE_URL = fallbackBaseUrl;
        }

        return fallbackResponse;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw originalError; // Throw the original error if fallback fails
      }
    }

    throw originalError;
  };

  // Enhanced error handling with smart fallback
  return fetch(url, fetchOptions)
    .then(async (response) => {
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url
      });

      // Check if we got HTML when expecting JSON (indicates wrong API endpoint)
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('text/html')) {
        console.warn('⚠️ Received HTML when expecting JSON - attempting fallback URL');

        // Clone the response to read it without consuming the stream
        const responseClone = response.clone();
        const text = await responseClone.text();

        if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
          console.error('🚨 Confirmed HTML response - trying fallback');
          return await tryFallbackUrl(new Error('Received HTML instead of JSON'));
        }
      }

      return response;
    })
    .catch(async (error) => {
      console.error('❌ Fetch Error:', { url, error: error.message, stack: error.stack });

      // Try fallback URL if the primary request failed
      return await tryFallbackUrl(error);
    });
};

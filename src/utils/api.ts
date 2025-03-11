// API utility functions with CORS proxy
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';
// Use a reliable CORS proxy service
const CORS_PROXY = 'https://corsproxy.io/?';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Wrapper for fetch that handles CORS issues with multiple fallback strategies
 */
export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  // Determine if we need to use the full URL or just the endpoint
  const directUrl = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;
  
  console.log(`Attempting to fetch from: ${directUrl}`);
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Handle JSON body
  let body = options.body;
  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
  }

  try {
    // First try direct request
    try {
      const response = await fetch(directUrl, {
        ...options,
        headers,
        body,
        mode: 'cors',
        credentials: 'include',
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json() as T;
        }
        return await response.text() as unknown as T;
      }
    } catch (directError) {
      console.log('Direct request failed, trying CORS proxy...');
    }
    
    // If direct request fails, try using CORS proxy
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;
    console.log(`Fetching via CORS proxy: ${proxyUrl}`);
    
    const proxyResponse = await fetch(proxyUrl, {
      ...options,
      headers,
      body,
      // Don't include credentials when using a proxy
      credentials: 'omit',
    });
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      throw new Error(errorText || `API request failed with status ${proxyResponse.status}`);
    }
    
    const contentType = proxyResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await proxyResponse.json() as T;
    }
    
    return await proxyResponse.text() as unknown as T;
  } catch (error) {
    console.error(`Error fetching ${directUrl}:`, error);
    
    // Return empty structures based on the endpoint to avoid breaking the UI
    if (endpoint.includes('/schedules')) {
      return [] as unknown as T;
    }
    return {} as T;
  }
}

// Common API methods
export const api = {
  // GET request
  get: <T = any>(endpoint: string, options: FetchOptions = {}) => 
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),
  
  // POST request
  post: <T = any>(endpoint: string, data: any, options: FetchOptions = {}) => 
    fetchApi<T>(endpoint, { ...options, method: 'POST', body: data }),
  
  // PUT request
  put: <T = any>(endpoint: string, data: any, options: FetchOptions = {}) => 
    fetchApi<T>(endpoint, { ...options, method: 'PUT', body: data }),
  
  // PATCH request
  patch: <T = any>(endpoint: string, data: any = {}, options: FetchOptions = {}) => 
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body: data }),
  
  // DELETE request
  delete: <T = any>(endpoint: string, options: FetchOptions = {}) => 
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;

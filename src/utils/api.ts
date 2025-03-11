// API utility functions with CORS handling
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';
// CORS Proxy URL - use a more reliable CORS proxy
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Wrapper for fetch that handles CORS and JSON parsing
 */
export async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  // Determine if we need to use the full URL or just the endpoint
  const baseUrl = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;
  
  // Use CORS proxy for all API calls to the backend
  const url = baseUrl.includes(BACKEND_API_URL) 
    ? `${CORS_PROXY}${encodeURIComponent(baseUrl)}` 
    : baseUrl;
  
  // Prepare headers with CORS support
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
    console.log(`Fetching from: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
      body,
      mode: 'cors',
      credentials: 'omit', // Changed to 'omit' when using a proxy
    });

    // Check if the response is ok (status in the range 200-299)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API request failed with status ${response.status}`);
    }

    // Parse JSON response if content exists
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// Common API methods
export const api = {
  // GET request
  get: (endpoint: string, options: FetchOptions = {}) => 
    fetchApi(endpoint, { ...options, method: 'GET' }),
  
  // POST request
  post: (endpoint: string, data: any, options: FetchOptions = {}) => 
    fetchApi(endpoint, { ...options, method: 'POST', body: data }),
  
  // PUT request
  put: (endpoint: string, data: any, options: FetchOptions = {}) => 
    fetchApi(endpoint, { ...options, method: 'PUT', body: data }),
  
  // PATCH request
  patch: (endpoint: string, data: any = {}, options: FetchOptions = {}) => 
    fetchApi(endpoint, { ...options, method: 'PATCH', body: data }),
  
  // DELETE request
  delete: (endpoint: string, options: FetchOptions = {}) => 
    fetchApi(endpoint, { ...options, method: 'DELETE' }),
};

export default api;

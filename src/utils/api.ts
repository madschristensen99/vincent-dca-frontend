// API utility functions with CORS handling
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Wrapper for fetch that handles CORS and JSON parsing
 */
export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  // Determine if we need to use the full URL or just the endpoint
  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;
  
  console.log(`Fetching from: ${url}`);
  
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
    // Use regular CORS mode since backend is properly configured
    const response = await fetch(url, {
      ...options,
      headers,
      body,
      mode: 'cors',
      credentials: 'include',
    });

    // Check if the response is ok
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API request failed with status ${response.status}`);
    }

    // Parse JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    }
    
    return await response.text() as unknown as T;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
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

// API utility functions with proxy to avoid CORS issues
const API_PROXY = '/api/proxy';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Wrapper for fetch that uses a local API proxy to avoid CORS issues
 */
export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  // Remove any leading slash from the endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Use our local API proxy
  const url = `${API_PROXY}/${cleanEndpoint}`;
  
  console.log(`Fetching via proxy: ${url}`);
  
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
    const response = await fetch(url, {
      ...options,
      headers,
      body,
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

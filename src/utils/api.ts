// API utility functions with CORS handling
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';

interface FetchOptions extends RequestInit {
  body?: any;
}

/**
 * Direct fetch to backend without proxy - will have CORS issues but used as fallback
 */
async function directFetch(url: string, options: FetchOptions = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    mode: 'cors',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text();
}

/**
 * Wrapper for fetch that handles CORS and JSON parsing
 */
export async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  // Determine if we need to use the full URL or just the endpoint
  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_API_URL}${endpoint}`;
  
  console.log(`Fetching from: ${url}`);
  
  try {
    // First try direct fetch - this might work if CORS is configured correctly
    return await directFetch(url, options);
  } catch (error) {
    // If direct fetch fails with CORS error, try using a proxy
    if (error instanceof Error && error.message.includes('CORS')) {
      console.log('CORS error detected, trying with proxy...');
      return await fetchWithProxy(url, options);
    }
    throw error;
  }
}

/**
 * Fetch using proxy as a fallback for CORS issues
 */
async function fetchWithProxy(url: string, options: FetchOptions = {}) {
  // For GET requests, we can use a simple proxy
  if (!options.method || options.method === 'GET') {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&callback=?`;
    console.log(`Using proxy for GET: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    if (data.contents) {
      try {
        // Try to parse the contents as JSON
        return JSON.parse(data.contents);
      } catch (e) {
        // If it's not valid JSON, return as text
        return data.contents;
      }
    }
    throw new Error('Empty response from proxy');
  } 
  
  // For other methods (POST, PUT, etc.), we need a different approach
  // Use a serverless function or a different proxy that supports these methods
  console.log('Using JSONP for non-GET request');
  
  // Create a form with the request details to send to our proxy
  const formData = new FormData();
  formData.append('url', url);
  formData.append('method', options.method || 'GET');
  
  if (options.body) {
    formData.append('data', typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
  }
  
  // Use a different proxy for non-GET requests
  const response = await fetch('https://cors-proxy.htmldriven.com/api/v1/proxy', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Proxy request failed with status ${response.status}`);
  }
  
  const proxyResponse = await response.json();
  if (proxyResponse.success && proxyResponse.response) {
    try {
      // Try to parse the response as JSON
      return JSON.parse(proxyResponse.response);
    } catch (e) {
      // If it's not valid JSON, return as text
      return proxyResponse.response;
    }
  }
  
  throw new Error('Failed to get response from proxy');
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

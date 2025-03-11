import { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://vincent-dca-service.herokuapp.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the path from the request
    const { path } = req.query;
    
    // Construct the full URL to the backend
    const pathArray = Array.isArray(path) ? path : [path];
    const targetUrl = `${BACKEND_URL}/${pathArray.join('/')}`;
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Forward the request method, headers, and body
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    
    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      options.body = JSON.stringify(req.body);
    }
    
    // Make the request to the backend
    const response = await fetch(targetUrl, options);
    
    // Get the response data
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Set the status code
    res.status(response.status);
    
    // Return the response
    res.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request to backend' });
  }
}

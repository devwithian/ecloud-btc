import { toast } from 'sonner';

type apiRequestOpts = RequestInit & { useDefaultErrorHandler?: boolean;
  /**
   * The payload to be sent in the request body. If provided, it will be stringified and set as the body of the request.
   */
  payload?: any; };

// Generic API Request Function. If not authorized, it will return a 401 error, and redirect to login page.
export async function apiRequest(endpoint: string, options: apiRequestOpts = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },

  useDefaultErrorHandler: false,
}) {
  if (options.payload) {
    options.body = JSON.stringify(options.payload);
  }

  const response = await fetch(`/api/${endpoint}`, options);
  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login page
      window.location.href = '/login';
    } else if (response.status >= 500) {
      if (options.useDefaultErrorHandler !== false) {
        toast('An error occurred', { description: 'Please try again later.', duration: 4000 });
      }
      throw new Error(`API request failed with status ${response.status}`);
    } else if (response.status < 500) {
      const error = await response.json();
      // if (options.useDefaultErrorHandler !== false) {
      //   toast(error.message || 'An error occurred', { description: error.description || 'Please try again later.', duration: 4000 });
      // }
      throw error;
    }
  }
  return response.json();
}

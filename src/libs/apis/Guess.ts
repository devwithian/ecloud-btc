import type { GuessRequestPayload } from '@/validations/GuessValidation';

import { apiRequest } from '@/libs/apiConfig';

export const createGuess = async (requestPayload: GuessRequestPayload) => {
  return apiRequest('protected/guesses', {
    method: 'POST',
    payload: requestPayload,
    useDefaultErrorHandler: true,
  });
};

// Call Get Active Guess API
export const getActiveGuess = async () => {
  return apiRequest('protected/guesses/active', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    useDefaultErrorHandler: true,
  });
};

// Manually resolve active guess (for testing purposes). Ideally, this should be done via a background job or similar mechanism.
export const resolveActiveGuess = async () => {
  return apiRequest('protected/guesses/active/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    useDefaultErrorHandler: true,
  });
};

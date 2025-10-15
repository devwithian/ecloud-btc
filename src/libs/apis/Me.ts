import { apiRequest } from '@/libs/apiConfig';

export const getMyProfile = async () => {
  return apiRequest('protected/me', { useDefaultErrorHandler: true });
};

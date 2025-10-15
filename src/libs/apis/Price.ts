import { apiRequest } from '@/libs/apiConfig';

export const getLatestPrice = async () => {
  return apiRequest('protected/price', { method: 'GET', useDefaultErrorHandler: true });
};

export const getPriceChartData = async () => {
  return apiRequest('protected/price/chart', { method: 'GET', useDefaultErrorHandler: true });
};

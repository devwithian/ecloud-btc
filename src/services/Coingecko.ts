export type CoinGeckoPrice = {
  bitcoin: {
    usd: number;
    last_updated_at: number;
  };
};

export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
export const BTC_PRICE_ENDPOINT = '/simple/price';

export async function getBTCPrice(): Promise<CoinGeckoPrice['bitcoin']> {
  const queryParams = new URLSearchParams({
    ids: 'bitcoin',
    vs_currencies: 'usd',
    include_last_updated_at: 'true',
    precision: '2',
  });

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // Add API key if available
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const response = await fetch(
    `${COINGECKO_API_URL}${BTC_PRICE_ENDPOINT}?${queryParams}`,
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data: CoinGeckoPrice = await response.json();

  data.bitcoin.usd = data.bitcoin.usd * 100; // Convert to cents
  data.bitcoin.last_updated_at = data.bitcoin.last_updated_at * 1000; // Convert to milliseconds

  return data.bitcoin;
}

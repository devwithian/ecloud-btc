import type { CoinGeckoPrice } from '@/services/Coingecko';
import type { PriceRecord } from '@/types/ApiSchema';
import { desc } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { priceCacheSchema } from '@/models/Schema';
import { getBTCPrice } from '@/services/Coingecko';

export const getLatestCachedPrice = async (): Promise<PriceRecord | undefined> => {
  const priceRecord = await db.query.priceCacheSchema.findFirst({
    orderBy: desc(priceCacheSchema.fetchedAt),
  });

  return priceRecord;
};

export async function getCurrentPrice(): Promise<CoinGeckoPrice['bitcoin']> {
  return await getBTCPrice();
}

/**
 * Poll the CoinGecko API for the current BTC price and cache it in the database.
 * This function checks if the price has changed since the last fetch to avoid duplicate entries.
 */
export async function pollPrice() {
  try {
    console.log(`Pulling the BTC price update at: ${new Date()}`); /* eslint-disable-line no-console */
    const priceData = await getCurrentPrice();

    // Check if cached price has changed
    // If changed, insert new record into priceCacheSchema
    // If not changed, skip insertion to avoid duplicates

    const latestCachedPrice = await db.query.priceCacheSchema.findFirst({
      orderBy: desc(priceCacheSchema.fetchedAt),
    });

    // If no cached price or price or lastUpdatedAt has changed, insert new record
    if (!latestCachedPrice || (latestCachedPrice.price !== priceData.usd || latestCachedPrice.lastUpdatedAt.getTime() !== priceData.last_updated_at)) {
      await db.insert(priceCacheSchema).values({
        price: priceData.usd, // Store as integer (cents)
        fetchedAt: new Date(),
        lastUpdatedAt: new Date(priceData.last_updated_at),
      });
    }
  } catch (error) {
    console.error('Price polling failed:', error);
  }
}

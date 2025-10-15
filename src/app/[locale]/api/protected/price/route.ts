// Get the current BTC price
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';

import { priceCacheSchema } from '@/models/Schema';

export const GET = async () => {
  // Get the latest cached BTC price
  const priceRecord = await db.query.priceCacheSchema.findFirst({
    orderBy: desc(priceCacheSchema.fetchedAt),
  });

  if (!priceRecord) {
    return NextResponse.json(
      { message: 'no_price_data_available' },
      { status: 503 },
    );
  }

  return NextResponse.json(priceRecord);
};

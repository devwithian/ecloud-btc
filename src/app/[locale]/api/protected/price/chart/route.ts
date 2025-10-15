import { desc, sql } from 'drizzle-orm';

// Get the current BTC price
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';
import { priceCacheSchema } from '@/models/Schema';

export const GET = async () => {
  // Group by minute for the last 10 minutes (UTC)
  const rows = await db
    .select({
      minute_label: sql`TO_CHAR(date_trunc('minute', "fetched_at"), 'HH24:MI')`.as('minute_label'),
      price: sql<number>`avg(${priceCacheSchema.price})`,
    })
    .from(priceCacheSchema)
    // .where(gte(priceCacheSchema.fetchedAt, sql`now() - interval '10 minutes'`))
    .groupBy(sql`date_trunc('minute', ${priceCacheSchema.fetchedAt})`)
    .orderBy(desc(sql`date_trunc('minute', ${priceCacheSchema.fetchedAt})`))
    .limit(15);

  // Return simple chart data: { time: 'HH:mm', price: number }
  const chartData = rows.map(r => ({
    minute_label: r.minute_label,
    price: Math.round(Number(r.price)) / 100, // Ensure price is in dollars and a float
  }));

  return NextResponse.json(chartData);
};

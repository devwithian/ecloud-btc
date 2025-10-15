import type { Player } from '@/types/ApiSchema';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/libs/DB';
import { guessSchema } from '@/models/Schema';

import { getLatestCachedPrice } from '@/services/Price';
import { withAuth } from '@/utils/Auth';

// Get active guess for the authenticated player
export const GET = withAuth(async (_, player: Player) => {
  // Get latest cached BTC price
  const currentPrice = await getLatestCachedPrice();
  if (currentPrice === undefined) {
    return NextResponse.json({ error: 'price_not_available' }, { status: 403 });
  }

  const now = new Date();

  // Check if player has an active guess (not resolved and not expired)
  const activeGuess = await db.query.guessSchema.findFirst({
    // Active guess is one that is not resolved and not expired
    where: and(
      eq(guessSchema.playerId, player.id),
      isNull(guessSchema.resolvedAt),
      gt(guessSchema.expiresAt, now),
    ),
    orderBy: desc(guessSchema.createdAt),
  });

  if (!activeGuess) {
    return NextResponse.json({}); // No active guess
  }

  return NextResponse.json(activeGuess);
});

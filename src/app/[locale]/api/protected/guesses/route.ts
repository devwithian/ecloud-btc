import type { NextRequest } from 'next/server';
import { addSeconds } from 'date-fns';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/libs/DB';
import { guessSchema } from '@/models/Schema';
import { STALE_PRICE_THRESHOLD } from '@/services/Config';

import { getLatestCachedPrice } from '@/services/Price';

import { withAuth } from '@/utils/Auth';
import { GuessValidation } from '@/validations/GuessValidation';

// POST /api/protected/guesses  - Create a new guess. Transaction is used to ensure data integrity. Only one active guess per player is allowed.
export const POST = withAuth(async (request: NextRequest, player) => {
  const json = await request.json();
  const parse = GuessValidation.safeParse(json);

  if (!parse.success) {
    return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
  }

  const { guessDirection } = parse.data;

  try {
    // Get latest cached BTC price
    const currentPrice = await getLatestCachedPrice();
    if (currentPrice === undefined) {
      return NextResponse.json({ error: 'price_not_available' }, { status: 403 });
    }

    const txResult = await db.transaction(async (tx) => {
      const now = new Date();

      // Check if player has an active guess (not resolved and not expired)
      const activeGuess = await tx.query.guessSchema.findFirst({
        // Active guess is one that is not resolved and not expired
        where: and(
          eq(guessSchema.playerId, player.id),
          isNull(guessSchema.resolvedAt),
          gt(guessSchema.expiresAt, now),
        ),
        orderBy: desc(guessSchema.createdAt),
      });

      if (activeGuess) {
        throw new Error('active_guess_exists');
      }

      // Create new guess - the unique constraint will prevent duplicate active guesses
      const newGuess = await tx.insert(guessSchema).values({
        playerId: player.id,
        guessDirection: guessDirection === 'up' ? 1 : -1,
        priceAtGuess: currentPrice.price,
        createdAt: now,
        expiresAt: addSeconds(now, STALE_PRICE_THRESHOLD), // Set expiration time based on the threshold
        priceCacheIdAtGuess: currentPrice.id,
      }).returning().then(res => res[0]);

      return newGuess;
    });

    return NextResponse.json(txResult, { status: 201 });
  } catch (error) {
    console.error('Failed to create guess:', error);
    if (error instanceof Error && error.message === 'active_guess_exists') {
      return NextResponse.json(
        { error: 'active_guess_exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 },
    );
  }
});

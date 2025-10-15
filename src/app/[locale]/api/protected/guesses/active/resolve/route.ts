import type { Player } from '@/types/ApiSchema';
import { addSeconds } from 'date-fns';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/libs/DB';
import { guessSchema, playerSchema } from '@/models/Schema';
import { STALE_PRICE_THRESHOLD } from '@/services/Config';
import { getLatestCachedPrice } from '@/services/Price';

import { withAuth } from '@/utils/Auth';

// Manually resolve active guess for the authenticated player (for testing purposes). Ideally, this should be done via a background job or similar mechanism.
export const POST = withAuth(async (_, player: Player) => {
  // Get latest cached BTC price
  const currentPrice = await getLatestCachedPrice();
  if (currentPrice === undefined) {
    return NextResponse.json({ error: 'price_not_available' }, { status: 403 });
  }

  const now = new Date();

  // Determine if the guess is stale (based on current price age)
  const isStale = (currentPrice.fetchedAt < addSeconds(now, -STALE_PRICE_THRESHOLD));

  let wasCorrect: boolean | null = null;

  try {
    // Update the guess as resolved & the score if correct. Use a transaction to ensure data integrity.
    const result = await db.transaction(async (tx) => {
      // Check if player has an active guess (not resolved and not expired)
      const activeGuess = await tx.query.guessSchema.findFirst({
        where: and(
          eq(guessSchema.playerId, player.id),
          isNull(guessSchema.resolvedAt),
          gt(guessSchema.expiresAt, now),
        ),
        orderBy: desc(guessSchema.createdAt),
      });

      if (!activeGuess) {
        return { success: false, error: 'no_active_guess' };
      }

      // If the price data is stale, mark the guess as resolved but do not update isCorrect or priceAtResolve
      // If the guessed = latest price, also consider it stale (no one can predict the exact price)
      if (isStale || currentPrice.price === activeGuess.priceAtGuess) {
        // Mark the guess as resolved but do not update isCorrect or priceAtResolve
        await tx.update(guessSchema).set({
          resolvedAt: now,
          priceCacheIdAtResolve: currentPrice.id,
        }).where(eq(guessSchema.id, activeGuess.id));

        // throw new Error('price_stale');
        return { success: false, error: 'price_stale' };
      }

      // Resolve the guess based on the current price and determine if the player was correct
      wasCorrect = (activeGuess.guessDirection === 1 && currentPrice.price > activeGuess.priceAtGuess)
        || (activeGuess.guessDirection === -1 && currentPrice.price < activeGuess.priceAtGuess);

      await tx.update(guessSchema).set({
        resolvedAt: now,
        isCorrect: wasCorrect ? 1 : 0,
        priceAtResolve: currentPrice.price,
        priceCacheIdAtResolve: currentPrice.id,
      }).where(eq(guessSchema.id, activeGuess.id));

      // Update player score: +1 if correct, -1 if wrong (not below 0)
      const newScore = wasCorrect ? player.score + 1 : Math.max(player.score - 1, 0);
      await tx.update(playerSchema).set({
        score: newScore,
      }).where(eq(playerSchema.id, player.id));

      const updatedGuess = await tx.query.guessSchema.findFirst({
        where: eq(guessSchema.id, activeGuess.id),
      });

      // Reflect the updated score in the player object for the response
      player.score = newScore;

      return { success: true, player, wasCorrect, updatedGuess, error: '' };
    });

    if (!result.success) {
      if (result.error === 'no_active_guess') {
        return NextResponse.json(
          { error: 'no_active_guess' },
          { status: 404 },
        );
      }
      if (result.error === 'price_stale') {
        return NextResponse.json(
          { error: 'price_stale' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ player, wasCorrect, guess: result.updatedGuess }, { status: 200 });
  } catch (error) {
    console.error('Failed to resolve guess:', error);

    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 },
    );
  }
});

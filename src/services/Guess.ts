import { addSeconds } from 'date-fns';
import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
// 1 minute, to be calculated in seconds with date operation
import { db } from '@/libs/DB';
import { guessSchema, playerSchema } from '@/models/Schema';
import { RESOLUTION_TIME, RESOLUTION_TIME_BUFFER, STALE_PRICE_THRESHOLD } from '@/services/Config';
import { getLatestCachedPrice } from '@/services/Price';

// Worker logic to process active guesses and resolve them after 60 seconds and no manual resolve API called from frontend. Add 5 seconds buffer after the 60 seconds period.
// This worker will run indefinitely and poll the database for active guesses to resolve.
// It will check every 15 seconds (POLLING_INTERVAL) for any active guesses that need to be resolved.
// If an active guess is found that has expired, it will resolve the guess based on the latest cached price.
// The worker will log its activity to the console for monitoring purposes.
export async function pollActiveGuesses() {
  console.log(`Polling active guesses at: ${new Date()}`); /* eslint-disable-line no-console */

  try {
    // Get all active guesses that haven't expired but passed the resolution time (RESOLUTION_TIME + buffer)
    const now = new Date();

    const totalResolutionTime = RESOLUTION_TIME + RESOLUTION_TIME_BUFFER;
    const activeGuesses = await db.query.guessSchema.findMany({
      where: and(
        lte(sql`${guessSchema.createdAt} + INTERVAL '1 second' * ${totalResolutionTime}`, now),
        isNull(guessSchema.resolvedAt),
        gt(guessSchema.expiresAt, now),
      ),
      orderBy: desc(guessSchema.createdAt),
      limit: 100, // Process up to 100 guesses at a time to avoid long-running transactions
    });

    console.log(`Found ${activeGuesses.length} active guesses to process.`); /* eslint-disable-line no-console */

    for (const guess of activeGuesses) {
      console.log(`Processing guess ID: ${guess.id} for player ID: ${guess.playerId}`); /* eslint-disable-line no-console */

      // Get latest cached BTC price
      const currentPrice = await getLatestCachedPrice();
      if (currentPrice === undefined) {
        console.log(`Skipping guess ID: ${guess.id} due to unavailable price data.`); /* eslint-disable-line no-console */
        continue; // Skip if no price data available
      }

      const isStale = (currentPrice.fetchedAt < addSeconds(now, -STALE_PRICE_THRESHOLD));
      let wasCorrect: boolean | null = null;

      try {
        // Update the guess as resolved & the score if correct. Use a transaction to ensure data integrity.
        const result = await db.transaction(async (tx) => {
          // Re-check if the guess is still active (not resolved and not expired)
          const activeGuess = await tx.query.guessSchema.findFirst({
            where: and(
              eq(guessSchema.id, guess.id),
              eq(guessSchema.playerId, guess.playerId),
              isNull(guessSchema.resolvedAt),
              gt(guessSchema.expiresAt, now),
            ),
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
          const player = await tx.query.playerSchema.findFirst({
            where: eq(playerSchema.id, activeGuess.playerId),
          });

          if (!player) {
            throw new Error('Player not found');
          } // This should not happen as we have playerId from the guess

          const newScore = wasCorrect ? player.score + 1 : Math.max(player.score - 1, 0);
          await tx.update(playerSchema).set({
            score: newScore,
          }).where(eq(playerSchema.id, player.id));

          return { success: true, error: '' };
        });

        if (!result.success) {
          if (result.error === 'no_active_guess') {
            console.log(`Guess ID: ${guess.id} is no longer active. Skipping.`); /* eslint-disable-line no-console */
          } else if (result.error === 'price_stale') {
            console.log(`Guess ID: ${guess.id} could not be resolved due to stale price data.`); /* eslint-disable-line no-console */
          }
          continue;
        }

        console.log(`Guess ID: ${guess.id} resolved. Was correct: ${wasCorrect}`); /* eslint-disable-line no-console */
      } catch (error) {
        console.error(`Error processing guess ID: ${guess.id}`, error);
        // Continue with next guess
      }
    }
  } catch (error) {
    console.error('Error polling active guesses:', error);
  }
}

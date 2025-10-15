import type { InferSelectModel } from 'drizzle-orm';
import type { guessSchema, playerSchema, priceCacheSchema } from '@/models/Schema';

// Export the inferred types from your schema
export type Player = InferSelectModel<typeof playerSchema>;
export type PriceRecord = InferSelectModel<typeof priceCacheSchema>;
export type Guess = InferSelectModel<typeof guessSchema>;

import { index, integer, pgTable, serial, smallint, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// The migration is automatically applied during the Next.js initialization process through `instrumentation.ts`.
// Simply restart your Next.js server to apply the database changes.
// Alternatively, if your database is running, you can run `npm run db:migrate` and there is no need to restart the server.

// Tested and compatible with Next.js Boilerplate

// export const counterSchema = pgTable('counter', {
//   id: serial('id').primaryKey(),
//   count: integer('count').default(0),
//   updatedAt: timestamp('updated_at', { mode: 'date' })
//     .defaultNow()
//     .$onUpdate(() => new Date())
//     .notNull(),
//   createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
// });

// Player schema
export const playerSchema = pgTable('players', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(), // Maps to Clerk user ID
  score: integer('score').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, table => [
  uniqueIndex('user_id_cleark_idx').on(table.userId),
]);

// BTC price cache schema
export const priceCacheSchema = pgTable('price_cache', {
  id: serial('id').primaryKey(),
  price: integer('price').notNull(), // Price in cents
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).defaultNow().notNull(),
  lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' }).defaultNow().notNull(),
}, table => [
  index('price_idx').on(table.price),
  index('fetched_at_idx').on(table.fetchedAt),
  index('last_updated_at_idx').on(table.lastUpdatedAt),
]);

// Guess schema
export const guessSchema = pgTable('guesses', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id')
    .references(() => playerSchema.id)
    .notNull(),
  guessDirection: smallint('guess_direction').notNull(), // 1 for up, -1 for down
  priceAtGuess: integer('price_at_guess').notNull(), // Price in cents at the time of guess
  priceAtResolve: integer('price_at_resolve'), // Price in cents at the time of resolution
  // To ensure idempotency, we use a unique constraint on (player_id, created_at)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  isCorrect: smallint('is_correct'), // 1 for true, 0 for false, null for pending
  // Add link to the price cache at the time of guess (for historical reference)
  priceCacheIdAtGuess: integer('price_cache_id_at_guess')
    .references(() => priceCacheSchema.id),
  // Add link to the price cache at the time of resolution (for historical reference)
  priceCacheIdAtResolve: integer('price_cache_id_at_resolve')
    .references(() => priceCacheSchema.id),
}, table => [
  index('player_id_idx').on(table.playerId),
  index('created_at_idx').on(table.createdAt),
  index('expires_at_idx').on(table.expiresAt),
  index('resolved_at_idx').on(table.resolvedAt),
]);

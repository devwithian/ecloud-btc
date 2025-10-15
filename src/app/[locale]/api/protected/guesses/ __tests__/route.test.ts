import type { Guess } from '@/types/ApiSchema';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/libs/DB';
// Import after mocking
import { getLatestCachedPrice } from '@/services/Price';
import { POST as POST_RESOLVE } from '../active/resolve/route';
import { GET as GET_ACTIVE } from '../active/route';

import { POST as POST_GUESS } from '../route';

const TEST_BASE_URL = 'http://localhost:3000/api/protected';

// Mock dependencies
vi.mock('@/utils/Auth', () => ({
  withAuth: vi.fn((handler) => {
    return async (req: NextRequest) => {
      const mockPlayer = {
        id: 1,
        userId: 'user_123',
        score: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return handler(req, mockPlayer);
    };
  }),
}));

vi.mock('@/libs/DB', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
    query: {
      guessSchema: {
        findFirst: vi.fn(),
      },
      playerSchema: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/services/Price', () => ({
  getLatestCachedPrice: vi.fn(),
  STALE_PRICE_THRESHOLD: 60, // Add this - value in seconds
}));

describe('Guesses API - POST /api/guesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create an up guess successfully', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessDirection: 'up' }),
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1,
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction to execute the callback with a mock tx object
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn().mockResolvedValueOnce(null), // No active guess
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(mockGuess),
            }),
          }),
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_GUESS(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.guessDirection).toBe(1);
    expect(data.priceAtGuess).toBe(5000000);
  });

  it('should create a down guess successfully', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessDirection: 'down' }),
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: -1, // Changed from 0 to -1
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(mockGuess),
            }),
          }),
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_GUESS(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.guessDirection).toBe(-1); // Changed from 0 to -1
  });

  it('should return 409 if active guess exists', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessDirection: 'up' }),
    });

    const existingGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1,
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction with existing active guess
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn().mockResolvedValueOnce(existingGuess), // Active guess exists
          },
        },
      };

      return callback(mockTx as any);
    });

    const response = await POST_GUESS(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(409); // Changed from 400 to 409
    expect(data.error).toBe('active_guess_exists');
  });

  it('should return 403 if price is not available', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessDirection: 'up' }),
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce(undefined);

    const response = await POST_GUESS(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('price_not_available');
  });

  it('should return 422 for invalid guess direction', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessDirection: 'invalid' }),
    });

    const response = await POST_GUESS(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.properties).toBeDefined();
  });
});

describe('Guesses API - GET /api/guesses/active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return active guess successfully', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1,
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 30000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 30000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    vi.mocked(db.query.guessSchema.findFirst).mockResolvedValueOnce(mockGuess);

    const response = await GET_ACTIVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ...mockGuess, createdAt: mockGuess.createdAt.toISOString(), expiresAt: mockGuess.expiresAt.toISOString(), resolvedAt: null });
  });

  it('should return empty object when no active guess exists', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    vi.mocked(db.query.guessSchema.findFirst).mockResolvedValueOnce(undefined);

    const response = await GET_ACTIVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({});
  });

  it('should return 403 if price is not available', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce(undefined);

    const response = await GET_ACTIVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('price_not_available');
  });

  it('should handle null price from cache', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce(undefined);

    const response = await GET_ACTIVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('price_not_available');
  });

  it('should return most recent active guess', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    const newestGuess: Guess = {
      id: 2,
      playerId: 1,
      guessDirection: 0,
      priceAtGuess: 5100000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 10000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 50000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5100000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    vi.mocked(db.query.guessSchema.findFirst).mockResolvedValueOnce(newestGuess);

    const response = await GET_ACTIVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(2);
  });

  it('should handle database query errors', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active`, {
      method: 'GET',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    vi.mocked(db.query.guessSchema.findFirst).mockRejectedValueOnce(
      new Error('Database connection error'),
    );

    await expect(GET_ACTIVE(mockRequest)).rejects.toThrow('Database connection error');
  });
});

describe('Guesses API - POST /api/guesses/active/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve guess correctly when price went up', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1, // Up
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 30000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 30000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    const resolvedGuess: Guess = {
      ...mockGuess,
      priceAtResolve: 5100000,
      isCorrect: 1,
      resolvedAt: new Date(),
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5100000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction for resolve route
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            // First call: find active guess
            // Second call: find updated guess after update
            findFirst: vi.fn()
              .mockResolvedValueOnce(mockGuess)
              .mockResolvedValueOnce(resolvedGuess),
          },
        },
        update: vi.fn().mockImplementation(() => {
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined), // update returns void
          };
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wasCorrect).toBe(true);
    expect(data.guess.isCorrect).toBe(1);
    expect(data.guess.priceAtResolve).toBe(5100000);
  });

  it('should resolve guess incorrectly when price went down', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1, // Up (expecting price to go up)
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 30000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 30000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    const resolvedGuess: Guess = {
      ...mockGuess,
      priceAtResolve: 4900000,
      isCorrect: 0,
      resolvedAt: new Date(),
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 4900000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(mockGuess)
              .mockResolvedValueOnce(resolvedGuess),
          },
        },
        update: vi.fn().mockImplementation(() => {
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wasCorrect).toBe(false);
    expect(data.guess.isCorrect).toBe(0);
    expect(data.guess.priceAtResolve).toBe(4900000);
  });

  it('should return 404 when no active guess to resolve', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction that returns no active guess
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn().mockResolvedValueOnce(undefined), // No active guess
          },
        },
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('no_active_guess');
  });

  it('should return 403 if price is not available', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce(undefined);

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('price_not_available');
  });

  it('should return 403 if price is stale', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    // Mock a stale price (fetchedAt is more than STALE_PRICE_THRESHOLD seconds ago)
    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5000000,
      fetchedAt: new Date(Date.now() - 120000), // 2 minutes ago (stale if threshold is 60s)
      lastUpdatedAt: new Date(),
    } as any);

    // Mock transaction that detects stale price
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn().mockResolvedValueOnce({
              id: 1,
              playerId: 1,
              guessDirection: 1,
              priceAtGuess: 5000000,
              priceAtResolve: null,
              isCorrect: null,
              createdAt: new Date(Date.now() - 30000),
              resolvedAt: null,
              expiresAt: new Date(Date.now() + 30000),
            }),
          },
        },
        update: vi.fn().mockImplementation(() => {
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('price_stale');
  });

  it('should update player score after correct guess', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1,
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 30000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 30000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    const resolvedGuess: Guess = {
      ...mockGuess,
      priceAtResolve: 5100000,
      isCorrect: 1,
      resolvedAt: new Date(),
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 5100000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    let updateCallCount = 0;

    // Mock transaction with update call tracking
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(mockGuess)
              .mockResolvedValueOnce(resolvedGuess),
          },
        },
        update: vi.fn().mockImplementation(() => {
          updateCallCount++;
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.player.score).toBe(1); // Score increased from 0 to 1
    expect(updateCallCount).toBe(2); // Two updates: guess and player
  });

  it('should decrease player score after incorrect guess', async () => {
    const mockRequest = new NextRequest(`${TEST_BASE_URL}/guesses/active/resolve`, {
      method: 'POST',
    });

    const mockGuess: Guess = {
      id: 1,
      playerId: 1,
      guessDirection: 1, // Guessed up
      priceAtGuess: 5000000,
      priceAtResolve: null,
      isCorrect: null,
      createdAt: new Date(Date.now() - 30000),
      resolvedAt: null,
      expiresAt: new Date(Date.now() + 30000),
      priceCacheIdAtGuess: 1,
      priceCacheIdAtResolve: null,
    };

    const resolvedGuess: Guess = {
      ...mockGuess,
      priceAtResolve: 4900000, // Price went down
      isCorrect: 0,
      resolvedAt: new Date(),
    };

    vi.mocked(getLatestCachedPrice).mockResolvedValueOnce({
      id: 1,
      price: 4900000,
      fetchedAt: new Date(),
      lastUpdatedAt: new Date(),
    } as any);

    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const mockTx = {
        query: {
          guessSchema: {
            findFirst: vi.fn()
              .mockResolvedValueOnce(mockGuess)
              .mockResolvedValueOnce(resolvedGuess),
          },
        },
        update: vi.fn().mockImplementation(() => {
          return {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };

      return callback(mockTx as any);
    });

    const response = await POST_RESOLVE(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.player.score).toBe(0); // Score stays at 0 (Math.max(0 - 1, 0))
    expect(data.wasCorrect).toBe(false);
  });
});

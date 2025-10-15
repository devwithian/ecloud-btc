import type { Guess, Player } from '@/types/ApiSchema';

import { page } from '@vitest/browser/context';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createGuess, getActiveGuess } from '@/libs/apis/Guess';
import { getMyProfile } from '@/libs/apis/Me';
import { getPriceChartData } from '@/libs/apis/Price';
import Dashboard from './page';

// Mock the API modules before importing the component
vi.mock('@/libs/apis/Guess', () => ({
  createGuess: vi.fn(),
  getActiveGuess: vi.fn(),
  resolveActiveGuess: vi.fn(),
}));

vi.mock('@/libs/apis/Me', () => ({
  getMyProfile: vi.fn(),
}));

vi.mock('@/libs/apis/Price', () => ({
  getPriceChartData: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

vi.mock('recharts', () => ({
  Area: () => null,
  AreaChart: () => null,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: any) => children,
  XAxis: () => null,
  YAxis: () => null,
}));

describe('Dashboard', () => {
  const mockPlayer: Player = {
    id: 1,
    userId: 'user-1',
    score: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChartData = [
    { minute_label: '12:00', price: 50000 },
    { minute_label: '12:01', price: 50100 },
    { minute_label: '12:02', price: 50200 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(getMyProfile).mockResolvedValue(mockPlayer);
    vi.mocked(getPriceChartData).mockResolvedValue(mockChartData);
    vi.mocked(getActiveGuess).mockRejectedValue(new Error('No active guess'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial render', () => {
    it('should load and display player score', async () => {
      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(getMyProfile).toHaveBeenCalled();
      });

      await expect.element(page.getByText('10')).toBeInTheDocument();
    });

    it('should load chart data on mount', async () => {
      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(getPriceChartData).toHaveBeenCalled();
      });
    });

    it('should display guess buttons when no active guess', async () => {
      render(<Dashboard />);

      await vi.waitFor(async () => {
        await expect.element(page.getByRole('button', { name: /up/i })).toBeInTheDocument();
        await expect.element(page.getByRole('button', { name: /down/i })).toBeInTheDocument();
      });
    });

    it('should handle player data loading error', async () => {
      vi.mocked(getMyProfile).mockRejectedValue(new Error('API Error'));

      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          'Could not load player data.',
          { description: 'error' },
        );
      });
    });
  });

  describe('Creating guesses', () => {
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

    it('should create an up guess when up button is clicked', async () => {
      vi.mocked(createGuess).mockResolvedValue(mockGuess);

      render(<Dashboard />);

      const upButton = page.getByRole('button', { name: /up/i });
      await upButton.click();

      await vi.waitFor(() => {
        expect(createGuess).toHaveBeenCalledWith({ guessDirection: 'up' });
        expect(toast).toHaveBeenCalledWith(
          'Guess created!',
          expect.objectContaining({ description: expect.stringContaining('Up 📈') }),
        );
      });
    });

    it('should create a down guess when down button is clicked', async () => {
      const downGuess = { ...mockGuess, guessDirection: false };
      vi.mocked(createGuess).mockResolvedValue(downGuess);

      render(<Dashboard />);

      const downButton = page.getByRole('button', { name: /down/i });
      await downButton.click();

      await vi.waitFor(() => {
        expect(createGuess).toHaveBeenCalledWith({ guessDirection: 'down' });
        expect(toast).toHaveBeenCalledWith(
          'Guess created!',
          expect.objectContaining({ description: expect.stringContaining('Down 📉') }),
        );
      });
    });

    it('should handle active_guess_exists error', async () => {
      vi.mocked(createGuess).mockRejectedValue({ error: 'active_guess_exists' });

      render(<Dashboard />);

      const upButton = page.getByRole('button', { name: /up/i });
      await upButton.click();

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          'Error occurred',
          expect.objectContaining({
            description: expect.stringContaining('already have an active guess'),
          }),
        );
      });
    });

    it('should handle price_not_available error', async () => {
      vi.mocked(createGuess).mockRejectedValue({ error: 'price_not_available' });

      render(<Dashboard />);

      const upButton = page.getByRole('button', { name: /up/i });
      await upButton.click();

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          'Error occurred',
          expect.objectContaining({
            description: expect.stringContaining('Price data is not available'),
          }),
        );
      });
    });
  });

  describe('Active guess state', () => {
    const activeGuess: Guess = {
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

    it('should restore active guess on mount', async () => {
      vi.mocked(getActiveGuess).mockResolvedValue(activeGuess);

      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(getActiveGuess).toHaveBeenCalled();
      });
    });

    it('should display countdown when guess is active', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const now = Date.now();
      const activeGuess: Guess = {
        id: 1,
        playerId: 1,
        guessDirection: 1,
        priceAtGuess: 5000000,
        priceAtResolve: null,
        isCorrect: null,
        createdAt: new Date(now),
        resolvedAt: null,
        expiresAt: new Date(now + 60000), // 60 seconds from now
        priceCacheIdAtGuess: 1,
        priceCacheIdAtResolve: null,
      };

      vi.mocked(createGuess).mockResolvedValue(activeGuess);

      render(<Dashboard />);

      const upButton = page.getByRole('button', { name: /up/i });
      await upButton.click();

      await vi.waitFor(() => {
        expect(createGuess).toHaveBeenCalled();
      });

      // Wait for the buttons to disappear (means ActiveGuessCard is rendering)
      await vi.waitFor(async () => {
        await expect.element(upButton).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait a moment for the countdown to render
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check for countdown display - look for "60s" or similar pattern
      await vi.waitFor(async () => {
        const countdownText = page.getByText(/60s|59s|58s/);

        await expect.element(countdownText).toBeInTheDocument();
      }, { timeout: 5000 });

      vi.useFakeTimers(); // Restore fake timers for other tests
    });
  });

  describe('Score display', () => {
    it('should display positive score', async () => {
      vi.mocked(getMyProfile).mockResolvedValue({ ...mockPlayer, score: 5 });

      render(<Dashboard />);

      await vi.waitFor(async () => {
        await expect.element(page.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display negative score', async () => {
      vi.mocked(getMyProfile).mockResolvedValue({ ...mockPlayer, score: -3 });

      render(<Dashboard />);

      await vi.waitFor(async () => {
        await expect.element(page.getByText('-3')).toBeInTheDocument();
      });
    });

    it('should display zero score', async () => {
      vi.mocked(getMyProfile).mockResolvedValue({ ...mockPlayer, score: 0 });

      render(<Dashboard />);

      await vi.waitFor(async () => {
        await expect.element(page.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Chart rendering', () => {
    it('should display chart title', async () => {
      render(<Dashboard />);

      await expect.element(page.getByText(/BTC Price History/i)).toBeInTheDocument();
    });

    it('should display chart description', async () => {
      render(<Dashboard />);

      await expect.element(page.getByText(/Showing price changes/i)).toBeInTheDocument();
    });

    it('should handle chart data loading error', async () => {
      vi.mocked(getPriceChartData).mockRejectedValue(new Error('Chart error'));

      render(<Dashboard />);

      await vi.waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          'Could not load price chart data.',
          { description: 'error' },
        );
      });
    });
  });
});

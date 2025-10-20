'use client';

import type {
  ChartConfig,
} from '@/components/ui/chart';

import type { Guess, Player, PriceRecord } from '@/types/ApiSchema';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { toast } from 'sonner';
import { ActiveGuessCard } from '@/components/dashboard/active-guess-card';
import { GuessButtons } from '@/components/dashboard/guess-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { createGuess, getActiveGuess, resolveActiveGuess } from '@/libs/apis/Guess';
import { getMyProfile } from '@/libs/apis/Me';
import { getLatestPrice, getPriceChartData } from '@/libs/apis/Price';
import { RESOLUTION_TIME } from '@/services/Config';
import { getMinuteLabel } from '@/utils/Date';

const chartConfig = {
  price: {
    label: 'Price',
    margin: { top: 0, right: 10, bottom: 0, left: 0 },
    color: 'var(--chart-1)',
  },
} as ChartConfig;

export default function Dashboard() {
  const [score, setScore] = useState<number>(0);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [waitingChange, setWaitingChange] = useState(false);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [chartData, setChartData] = useState<{ minute_label: string; price: number }[]>([]);
  const [latestPriceData, setLatestPriceData] = useState<{ minute_label: string; price: number } | null>(null);
  const [activeGuess, setActiveGuess] = useState<Guess | null>(null);

  const _drawTheChart = () => {
    // Get price chart data
    getPriceChartData().then((data: { minute_label: string; price: number }[]) => {
      setChartData(data?.reverse() || []);
    }).catch((err) => {
      console.error(err);
      toast('Could not load price chart data.', { description: 'error' });
    });
  };

  const _getLatestPrice = () => {
    getLatestPrice().then((data: PriceRecord) => {
      if (data) {
        setLatestPriceData({ minute_label: getMinuteLabel(new Date(data.lastUpdatedAt)), price: (data.price / 100) });
      }
    }).catch((err) => {
      console.error(err);
      toast('Could not load latest price data.', { description: 'error' });
    });
  };

  // Guess button handler
  // If direction is already set, ignore further clicks
  // Disable button while submitting
  // Once guess is created, set direction and start countdown
  // After countdown, resolve the guess and show result
  // Reset direction and countdown after resolution
  function _onGuess(dir: 'up' | 'down') {
    if (direction) {
      return;
    }
    setSubmittingGuess(true);

    createGuess({
      guessDirection: dir,
    }).then((guess: Guess) => {
      // Guess created successfully
      toast('Guess created!', { description: `You guessed ${dir === 'up' ? 'Up 📈' : 'Down 📉'}. Good luck!` });
      setDirection(dir);
      setCountdown(60);
      setWaitingChange(false);
      setActiveGuess(guess);
    }).catch((err) => {
      if (err?.error === 'active_guess_exists') {
        toast('Error occurred', { description: 'You already have an active guess. Please wait for it to resolve before making a new guess.', duration: 8000 });
      } else if (err?.error === 'price_not_available') {
        toast('Error occurred', { description: 'Price data is not available. Please try again later.', duration: 8000 });
      } else {
        toast('Error occurred', { description: 'Could not create guess.', duration: 8000 });
      }
      // reset state
      setDirection(null);
      setCountdown(0);
      setWaitingChange(false);
    }).finally(() => {
      setSubmittingGuess(false);
    });
  }

  // Countdown effect
  useEffect(() => {
    if (!direction || countdown <= 0) {
      return;
    }
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [direction, countdown]);

  // Effect to resolve the guess when countdown reaches 0
  // Only run if there's a direction set (an active guess)
  // If the price data is stale, show error toast and reset state
  // Otherwise, show result toast and update score
  // Reset direction and countdown after resolution
  useEffect(() => {
    if (!direction) {
      return;
    }
    let id: NodeJS.Timeout;
    if (countdown === 0 && !waitingChange) {
      id = setTimeout(() => {
        resolveActiveGuess().then((data: { player: Player; wasCorrect: boolean | null; guess: Guess }) => {
        // resolved successfully
          setScore(data.player.score);
          toast(data.wasCorrect ? 'You won +1' : 'You lost −1', {
            duration: 10000,
            description: `Your guess was $${(data.guess.priceAtGuess / 100).toLocaleString()}. The price at resolution was $${(data.guess.priceAtResolve! / 100).toLocaleString()}.`,
          });
        }).catch((err) => {
          if (err?.error === 'price_stale') {
            toast('Error occurred', { description: 'Price data is stale. Guess is no longer valid and You can make a new guess.', duration: 8000 });
          } else if (err?.error === 'no_active_guess') {
            toast('Info', { description: 'Guess has already been resolved. You can make a new guess.', duration: 8000 });

            // Call /me API to refresh score in case the guess has been resolved elsewhere
            getMyProfile().then((data: Player) => {
              setScore(data.score);
            }).catch((err) => {
              console.error(err);
            });
          } else {
            toast('Error occurred', { description: 'Could not resolve guess.', duration: 8000 });
          }
        }).finally(() => {
          setWaitingChange(false);
          setDirection(null);
        });
        _drawTheChart();
      }, 500);
    }
    return () => id ? clearTimeout(id) : undefined;
  }, [direction, countdown, waitingChange]);

  // On mount, load player data and check for active guess
  useEffect(() => {
    getMyProfile().then((data: Player) => {
      setScore(data.score);

      // Check if there's an active guess from /api/guesses/active
      getActiveGuess().then((data: Guess) => {
        if (data && data.guessDirection) {
          setDirection(data.guessDirection === 1 ? 'up' : 'down');
          const shouldBeResolvedAt = new Date(data.createdAt).getTime() + RESOLUTION_TIME * 1000;
          const now = Date.now();
          const diffSec = Math.max(0, Math.floor((shouldBeResolvedAt - now) / 1000));
          setCountdown(diffSec);
          setWaitingChange(false);
          setActiveGuess(data);
        }
      }).catch(() => {
      // no active guess, that's fine
      });
    }).catch((err) => {
      console.error(err);
      toast('Could not load player data.', { description: 'error' });
    });
  }, []);

  // Set up interval to poll price data and latest price every 15 seconds
  useEffect(() => {
  // Execute immediately on mount
    _drawTheChart();
    _getLatestPrice();

    // Then set up interval for subsequent calls
    const intervalId = setInterval(() => {
      _drawTheChart();
      _getLatestPrice();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const progress = useMemo(() => ((60 - countdown) / 60) * 100, [countdown]);

  // Calculate price range for Y axis with some padding
  const priceRange = useMemo(() => {
    if (chartData.length === 0) {
      return { min: 0, max: 100000 };
    }

    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 100; // Add 10% padding or default 100

    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [chartData]);

  return (
    <div className="mt-10 mb-10">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="order-1 lg:order-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Play</span>
              <span className="text-sm font-normal text-muted-foreground">
                Latest BTC Price: $
                {latestPriceData ? (latestPriceData.price).toLocaleString() : '--'}
                {' '}
                (
                {'at '}
                {latestPriceData ? latestPriceData.minute_label : '--'}
                )
              </span>
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {!direction
              ? (
                  <GuessButtons onGuess={_onGuess} disabled={submittingGuess || direction !== null} />
                )
              : (
                  <ActiveGuessCard
                    guess={activeGuess}
                    direction={direction}
                    countdown={countdown}
                    progress={progress}
                  />
                )}
          </CardContent>
        </Card>

        <Card className="order-2 lg:order-2">
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className={`${score > 0 ? ' text-emerald-600' : score < 0 ? ' text-rose-600' : 'text-muted-foreground'} text-4xl font-semibold`}>
              { score === null
                ? (<>--</>)
                : (
                    <>
                      {score}
                    </>
                  ) }
            </div>
          </CardContent>
        </Card>

        <Card className="order-3 lg:order-3  lg:col-span-3">
          <CardHeader>
            <CardTitle>BTC Price History in US$ (demo data)</CardTitle>
            <CardDescription>
              Showing price changes for the last 15 fetched minutes (Average, UTC Time)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  bottom: 60,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="minute_label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -20 }}
                />
                <YAxis
                  domain={[priceRange.min, priceRange.max]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={value => `$${value.toLocaleString()}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideLabel />}
                />
                <Area
                  dataKey="price"
                  type="linear"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

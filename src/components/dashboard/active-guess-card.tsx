'use client';
import type { Guess } from '@/types/ApiSchema';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function ActiveGuessCard({
  guess,
  direction,
  countdown,
  progress,
  // waitingChange,
}: {
  guess: Guess | null;
  direction: 'up' | 'down';
  countdown: number;
  progress: number;
  // waitingChange: boolean;
}) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-3">
        <Badge variant={direction === 'up' ? 'outline' : 'destructive'} className={`tracking-wide uppercase ${direction === 'up' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
          You guessed
          {' '}
          {direction}
        </Badge>
      </div>
      <div>
        <p className="text-sm font-semibold ">
          The price at your guess was $
          {((guess?.priceAtGuess ?? 0) / 100).toLocaleString()}
        </p>
      </div>

      {countdown > 0
        ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Waiting for 60 seconds…</p>
              <Progress value={progress} className="h-2" />
              <p className="text-2xl font-semibold tabular-nums">
                {countdown}
                s
              </p>
            </div>
          )
        : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Waiting for next price change…</p>
              <div className="animate-pulse text-xs text-muted-foreground">This can take a few seconds</div>
            </div>
          )}
    </div>
  );
}

'use client';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GuessButtons({ onGuess, disabled }: { onGuess: (d: 'up' | 'down') => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <Button variant="outline" size="lg" className="w-56 bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white" name="btn-up-guess" disabled={disabled} onClick={() => onGuess('up')}>
        <ArrowUpWideNarrow className="mr-2 h-5 w-3" />
        {' '}
        Guess UP
      </Button>
      <Button variant="outline" size="lg" className="w-56" name="btn-down-guess" disabled={disabled} onClick={() => onGuess('down')}>
        <ArrowDownWideNarrow className="mr-2 h-5 w-3" />
        {' '}
        Guess DOWN
      </Button>
    </div>
  );
}

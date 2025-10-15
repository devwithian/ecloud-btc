'use client';

export function ScoreBadge({ score }: { score: number }) {
  const color = score > 0 ? 'bg-emerald-500/15 text-emerald-600' : score < 0 ? 'bg-rose-500/15 text-rose-600' : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}>
      Score:
      {' '}
      <span className="ml-1 tabular-nums">{score}</span>
    </span>
  );
}

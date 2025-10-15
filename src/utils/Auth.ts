import type { NextRequest } from 'next/server';
import type { Player } from '@/types/ApiSchema';
import { getAuth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { playerSchema } from '@/models/Schema';

export function withAuth(handler: (request: NextRequest, player: Player) => Promise<Response>) {
  return async (request: NextRequest) => {
    const { userId } = getAuth(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    let player = await db.query.playerSchema.findFirst({
      where: eq(playerSchema.userId, userId),
    });

    if (!player) {
      player = await db.insert(playerSchema).values({
        userId,
        score: 0,
      }).returning().then(r => r[0]);
    }

    return handler(request, player as Player);
  };
}

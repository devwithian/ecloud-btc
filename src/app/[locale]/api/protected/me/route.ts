// Get my own player's data
import { NextResponse } from 'next/server';

import { withAuth } from '@/utils/Auth';

export const GET = withAuth(async (_, player) => {
  return NextResponse.json(player);
});

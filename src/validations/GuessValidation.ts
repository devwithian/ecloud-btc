import z from 'zod';

export const GuessValidation = z.object({
  guessDirection: z.enum(['up', 'down']),
});

export type GuessRequestPayload = z.infer<typeof GuessValidation>;

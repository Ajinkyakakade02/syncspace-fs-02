import { z } from 'zod';

export const createVersionSchema = z.object({
  name: z.string().min(1, 'Version name is required').max(100),
  description: z.string().max(500).optional(),
});

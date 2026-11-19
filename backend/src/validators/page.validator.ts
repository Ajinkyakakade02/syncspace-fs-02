import { z } from 'zod';

export const createPageSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(120).default('Untitled'),
  icon: z.string().max(10).optional().default('📄'),
  order: z.number().int().optional().default(0),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  icon: z.string().max(10).optional(),
  order: z.number().int().optional(),
  isArchived: z.boolean().optional(),
});

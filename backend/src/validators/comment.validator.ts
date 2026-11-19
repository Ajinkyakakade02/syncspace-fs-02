import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  anchor: z
    .object({
      from: z.number().int().nonnegative().optional(),
      to: z.number().int().nonnegative().optional(),
      quote: z.string().max(300).optional(),
    })
    .optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const createReplySchema = z.object({
  content: z.string().min(1, 'Reply cannot be empty').max(2000),
});

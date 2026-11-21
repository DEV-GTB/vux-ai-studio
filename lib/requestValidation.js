import { z } from 'zod';

// Reusable middleware factory: validates req.body against a zod schema and
// replaces req.body with the parsed (and defaulted) value. On failure it
// returns a consistent 400 response with structured error details.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        details: result.error.flatten(),
      });
    }
    req.query = result.data;
    next();
  };
}

// Common schemas. They are intentionally permissive (passthrough + optional)
// so existing route logic keeps ownership of business rules and error messages.
export const chatBodySchema = z.object({
  messages: z.array(z.object({}).passthrough()).optional(),
}).passthrough();

export const codeBodySchema = z.object({
  request: z.string().optional(),
  activeFile: z.string().optional(),
  files: z.record(z.string()).optional(),
  folders: z.array(z.string()).optional(),
  history: z.array(z.any()).optional(),
  mode: z.enum(['auto', 'plan']).optional(),
}).passthrough();

export const visionBodySchema = z.object({
  imageUrl: z.string().optional(),
  message: z.string().optional(),
  model: z.string().optional(),
}).passthrough();

export const promptBodySchema = z.object({
  prompt: z.string().optional(),
  imageUrl: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).passthrough();

export const locationQuerySchema = z.object({
  location: z.string().optional(),
});

export const topicQuerySchema = z.object({
  topic: z.string().optional(),
});
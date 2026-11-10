import { ApiError } from '../utils/ApiError.js';

/**
 * Validate request parts with zod schemas. Parsed (and transformed) values are
 * placed on `req.valid.body`, `req.valid.query`, `req.valid.params`.
 * Express 5 makes `req.query` read-only, so we never overwrite the originals.
 *
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid ??= {};
    const details = [];

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ path: issue.path.join('.') || part, message: issue.message });
        }
      }
    }

    if (details.length) return next(ApiError.validation(details));
    return next();
  };
}

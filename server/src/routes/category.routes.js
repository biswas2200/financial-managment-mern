import { Router } from 'express';
import { z } from 'zod';
import { categoryApiSchema, TRANSACTION_TYPES } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import * as categories from '../controllers/category.controller.js';

const router = Router();

const listQuery = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  withUsage: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

router.get('/', validate({ query: listQuery }), categories.list);
router.post('/', validate({ body: categoryApiSchema }), categories.create);
router.patch('/:id', validate({ params: idParams, body: categoryApiSchema.partial() }), categories.update);
router.delete('/:id', validate({ params: idParams }), categories.remove);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { budgetApiSchema, monthKey, currentMonthKey } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import * as budgets from '../controllers/budget.controller.js';

const router = Router();

const monthQuery = z.object({ month: monthKey.default(() => currentMonthKey()) });
const copyBody = z.object({ from: monthKey, to: monthKey });

router.get('/', validate({ query: monthQuery }), budgets.list);
router.put('/', validate({ body: budgetApiSchema }), budgets.upsert);
router.post('/copy', validate({ body: copyBody }), budgets.copy);
router.delete('/:id', validate({ params: idParams }), budgets.remove);

export default router;

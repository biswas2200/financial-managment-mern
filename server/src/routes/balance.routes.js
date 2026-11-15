import { Router } from 'express';
import { z } from 'zod';
import { setBalanceApiSchema } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import * as balance from '../controllers/balance.controller.js';

const router = Router();

router.get('/', balance.get);
router.put('/', validate({ body: setBalanceApiSchema }), balance.set);
router.get('/banks', balance.banks);
router.post('/bank-demo', validate({ body: z.object({ bank: z.string().trim().min(1, 'Choose a bank') }) }), balance.fetchFromDemoBank);

export default router;

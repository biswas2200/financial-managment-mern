import { Router } from 'express';
import { transactionApiSchema, transactionQuerySchema } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import * as transactions from '../controllers/transaction.controller.js';

const router = Router();

// PATCH accepts any subset of fields, but no defaults (paymentMethod must not reset to UPI).
const updateSchema = transactionApiSchema
  .extend({ paymentMethod: transactionApiSchema.shape.paymentMethod.removeDefault() })
  .partial();

router.get('/', validate({ query: transactionQuerySchema }), transactions.list);
router.get('/export.csv', validate({ query: transactionQuerySchema }), transactions.exportCsv);
router.post('/', validate({ body: transactionApiSchema }), transactions.create);
router.get('/:id', validate({ params: idParams }), transactions.getOne);
router.patch('/:id', validate({ params: idParams, body: updateSchema }), transactions.update);
router.delete('/:id', validate({ params: idParams }), transactions.remove);

export default router;

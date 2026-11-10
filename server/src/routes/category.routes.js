import { Router } from 'express';
import * as categoryService from '../services/category.service.js';

const router = Router();

router.get('/', async (req, res) => {
  const type = ['income', 'expense'].includes(req.query.type) ? req.query.type : undefined;
  res.json(await categoryService.listCategories(req.user._id, { type }));
});

export default router;

import { Router } from 'express';
import { watchSchema } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import * as watchlist from '../services/watchlist.service.js';

export function watchlistRoutes(markets) {
  const router = Router();

  router.get('/', async (req, res) => res.json(await watchlist.listWatchlist(req.user._id, markets)));

  router.post('/', validate({ body: watchSchema }), async (req, res) => {
    const { item, created } = await watchlist.addToWatchlist(req.user._id, req.valid.body, markets);
    res.status(created ? 201 : 200).json(item);
  });

  router.delete('/:id', validate({ params: idParams }), async (req, res) => {
    await watchlist.removeFromWatchlist(req.user._id, req.valid.params.id);
    res.status(204).end();
  });

  return router;
}

import * as budgetService from '../services/budget.service.js';

export async function list(req, res) {
  res.json(await budgetService.listBudgets(req.user._id, req.valid.query.month));
}

export async function upsert(req, res) {
  res.json(await budgetService.upsertBudget(req.user._id, req.valid.body));
}

export async function copy(req, res) {
  const { from, to } = req.valid.body;
  res.json(await budgetService.copyBudgets(req.user._id, from, to));
}

export async function remove(req, res) {
  await budgetService.deleteBudget(req.user._id, req.valid.params.id);
  res.status(204).end();
}

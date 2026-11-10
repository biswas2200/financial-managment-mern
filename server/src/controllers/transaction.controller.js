import { toDayKey } from '@kosha/shared';
import * as transactionService from '../services/transaction.service.js';

export async function list(req, res) {
  res.json(await transactionService.listTransactions(req.user._id, req.valid.query));
}

export async function create(req, res) {
  res.status(201).json(await transactionService.createTransaction(req.user._id, req.valid.body));
}

export async function getOne(req, res) {
  res.json(await transactionService.getTransaction(req.user._id, req.valid.params.id));
}

export async function update(req, res) {
  res.json(await transactionService.updateTransaction(req.user._id, req.valid.params.id, req.valid.body));
}

export async function remove(req, res) {
  await transactionService.deleteTransaction(req.user._id, req.valid.params.id);
  res.status(204).end();
}

export async function exportCsv(req, res) {
  const csv = await transactionService.exportCsv(req.user._id, req.valid.query);
  res
    .type('text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="kosha-transactions-${toDayKey()}.csv"`)
    .send(csv);
}

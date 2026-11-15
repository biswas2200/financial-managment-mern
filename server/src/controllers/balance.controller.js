import * as balanceService from '../services/balance.service.js';

export async function get(req, res) {
  res.json(await balanceService.getBalance(req.user._id));
}

export async function set(req, res) {
  res.json(await balanceService.setBalance(req.user._id, req.valid.body.balance));
}

export function banks(_req, res) {
  res.json(balanceService.DEMO_BANKS);
}

export function fetchFromDemoBank(req, res) {
  res.json(balanceService.fetchDemoBankBalance(req.user._id, req.valid.body.bank));
}

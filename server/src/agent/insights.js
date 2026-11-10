/**
 * Dashboard insight cards, computed from the user's data with simple, explainable rules.
 */
import { formatMoney, toMonthKey } from '@kosha/shared';
import * as analytics from '../services/analytics.service.js';
import { listBudgets } from '../services/budget.service.js';

const fm = (m) => formatMoney(m, { decimals: 0 });

export async function generateInsights(userId, now = new Date()) {
  const month = toMonthKey(now);
  const [summary, byCategory, budgets, unusual] = await Promise.all([
    analytics.getSummary(userId, {}, now),
    analytics.getByCategory(userId, {}, now),
    listBudgets(userId, month),
    analytics.getUnusualSpending(userId, { month }, now),
  ]);

  const items = [];

  if (summary.savingsRate !== null) {
    const rate = summary.savingsRate;
    items.push({
      id: 'savings-rate',
      tone: rate >= 20 ? 'positive' : rate >= 0 ? 'neutral' : 'negative',
      title: rate >= 0 ? `You've kept ${rate}% of this month's income` : `Spending is ${Math.abs(rate)}% above income`,
      body:
        rate >= 0
          ? `${fm(summary.net)} saved from ${fm(summary.income)} earned so far.`
          : `${fm(summary.expense)} spent against ${fm(summary.income)} earned so far this month.`,
    });
  } else if (summary.expense > 0) {
    items.push({
      id: 'no-income',
      tone: 'neutral',
      title: 'No income logged this month yet',
      body: `${fm(summary.expense)} spent so far. Add your salary to see your savings rate.`,
    });
  }

  for (const b of budgets.items.filter((x) => x.status !== 'ok').slice(0, 2)) {
    items.push({
      id: `budget-${b.id}`,
      tone: b.status === 'over' ? 'negative' : 'warning',
      title: b.status === 'over' ? `Over budget on ${b.category.name}` : `${b.category.name} budget is ${b.percentUsed}% used`,
      body: `${fm(b.spent)} of ${fm(b.limit)}${b.status === 'over' ? `, ${fm(-b.remaining)} over` : `, ${fm(b.remaining)} left`}.`,
    });
  }

  if (unusual[0]) {
    const u = unusual[0];
    items.push({
      id: `unusual-${u.categoryId}`,
      tone: 'warning',
      title: `${u.name} is higher than usual`,
      body: `${fm(u.current)} so far vs a typical ${fm(u.average)} per month.`,
    });
  }

  const top = byCategory.items[0];
  if (top) {
    items.push({
      id: 'top-category',
      tone: 'neutral',
      title: `${top.name} is ${top.share}% of your spending`,
      body: `${fm(top.total)} across ${top.count} transaction${top.count === 1 ? '' : 's'} this month.`,
    });
  }

  if (summary.change.expense !== null && summary.change.expense <= -10) {
    items.push({
      id: 'spending-down',
      tone: 'positive',
      title: `Spending is down ${Math.abs(summary.change.expense)}%`,
      body: 'Compared with the same point last month. Nice work.',
    });
  }

  return { month, items: items.slice(0, 4) };
}

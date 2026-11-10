import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../../src/agent/intents.js';

describe('classifyIntent (offline rule engine)', () => {
  it.each([
    ['hi', 'greeting'],
    ['Hello there!', 'greeting'],
    ['what can you do?', 'help'],
    ['add 450 for groceries yesterday', 'add_transaction'],
    ['spent 300 on uber', 'add_transaction'],
    ['log ₹99 netflix', 'add_transaction'],
    ['received 85000 salary', 'add_transaction'],
    ['set a budget of 5000 for dining', 'set_budget'],
    ['budget 12k for groceries this month', 'set_budget'],
    ['how much did I spend this month?', 'summary'],
    ["what's my balance", 'summary'],
    ['summary for october', 'summary'],
    ['where is my money going', 'categories'],
    ['spending by category last month', 'categories'],
    ['what is my biggest expense', 'top_expense'],
    ['compare october and september', 'compare'],
    ['this month vs last month', 'compare'],
    ['am I over budget?', 'budget_status'],
    ['how are my budgets doing', 'budget_status'],
    ['any unusual spending?', 'unusual'],
    ['show my swiggy orders', 'find_transactions'],
    ['list my dining expenses last month', 'find_transactions'],
    ['how has my spending changed over 6 months', 'trend'],
    ['tips to save money', 'tips'],
    ['thanks!', 'thanks'],
    ['what is the capital of france', 'fallback'],
  ])('%s → %s', (text, intent) => {
    expect(classifyIntent(text)).toBe(intent);
  });
});

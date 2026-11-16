/**
 * Intent router for the offline engine. Rules run top to bottom; the first match wins.
 * (When Gemini is configured, the model decides which tool to call instead.)
 */
import { parseAmount } from './parser.js';

const wordCount = (t) => t.split(/\s+/).filter(Boolean).length;

export function classifyIntent(raw) {
  const t = raw.toLowerCase().trim();
  const has = (re) => re.test(t);
  const hasAmount = parseAmount(t) !== null;

  if (wordCount(t) <= 4 && has(/^(hi|hello|hey|hiya|namaste|yo|good (morning|afternoon|evening))\b/)) return 'greeting';
  if (wordCount(t) <= 5 && has(/^(thanks|thank you|thx|ty|great|awesome|cool|perfect|nice|ok(ay)?)\b/)) return 'thanks';
  if (has(/\b(help|what can you do|what do you do|how do i use|commands|capabilities)\b/)) return 'help';

  if (
    has(/\bbudgets?\b/) &&
    (hasAmount || has(/\b(set|create|make|add|change|update|increase|decrease|raise|lower)\b/)) &&
    !has(/\b(over|status|doing|left|remaining|how are|how's|am i|on track)\b/)
  ) {
    return 'set_budget';
  }

  const actionVerb = /\b(add|log|record|spent|spend|paid|pay|bought|buy|received|got|earned|note|track|enter|put)\b/;
  if (hasAmount && has(actionVerb)) return 'add_transaction';
  if (has(/\b(add|log|record|note|enter)\b/) && has(/\b(expense|income|transaction|purchase|payment|entry|spend)\b/)) {
    return 'add_transaction';
  }

  // Investing, markets and learning. These come after logging a payment, so "paid 5000 for my SIP" is still an expense.
  const notInvesting = /\b(laptop|phone|mobile|car|bike|scooter|house|flat|home|tv|ac|fridge|shoes|watch|gift|ticket|trip|insurance|loan|card|saree|dress|bag)\b/;
  if (
    !has(notInvesting) &&
    (has(/\b(should i|shall i|can i|is it (a )?(good|safe|wise|worth)( time)?( to)?)\s+(buy|sell|hold|invest|put money)/) ||
      has(/\b(best|top|good)\s+(stocks?|shares?|funds?|mutual funds?|sips?)\s+(to|for)\s+(buy|invest|sip|me)/) ||
      has(/\bwhich\s+(stocks?|shares?|funds?|mutual funds?|sips?|etfs?)\b.*\b(buy|invest|best|good|choose|pick)/) ||
      has(/\bwhat should i (buy|invest in|sell)\b/))
  ) {
    return 'invest_advice';
  }
  const explain = /\b(what is|what are|what's|explain|meaning of|how does|how do i (start|begin)|how to (start|begin)|teach me)\b/;
  const terms = /\b(sip|emergency fund|inflation|compound\w*|mutual funds?|index funds?|expense ratio|nav|p\/?e( ratio)?|credit scores?|term (insurance|plan)|health insurance|upi|scams?|asset allocation|investing|invest|elss|demat|nifty|sensex)\b/;
  if (has(explain) && has(terms)) return 'learn';
  if (has(/\bwatch ?list\b/)) return 'watchlist';
  if (
    has(/\b(mutual funds?|index funds?|nav|elss|flexi ?cap|small ?cap|mid ?cap|large ?cap|liquid fund|\w+ fund)\b/) &&
    !has(/\b(emergency|sinking|provident|retirement|savings?) fund\b/)
  ) {
    return 'fund_info';
  }
  if (has(/\b(nifty|sensex|stock market|share market|the market|markets?|gainers|losers|movers|bse|nse)\b/)) return 'market_overview';
  if (has(/\b(stocks?|shares?|price of|stock price)\b/)) return 'stock_info';

  if (has(/\bbudgets?\b/)) return 'budget_status';
  if (has(/\b(compare|comparison|vs\.?|versus|difference between)\b/)) return 'compare';
  if (has(/\b(unusual|weird|strange|spikes?|anomal\w*|abnormal|odd|suspicious|overspend\w*)\b/)) return 'unusual';
  if (has(/\b(biggest|largest|highest|top|most)\b/) && has(/\b(expenses?|spend\w*|categor\w*|purchases?|costs?)\b/)) {
    return 'top_expense';
  }
  if (
    has(/\b(show|list|find|search|see|display|view)\b/) &&
    has(/\b(transactions?|orders?|expenses|payments?|purchases?|entries|spends|bills)\b/)
  ) {
    return 'find_transactions';
  }
  if (has(/\b(categor\w*|breakdown|spending by|split|distribution)\b/) || has(/\bwhere\b.*\b(money|spend\w*|go\w*)\b/)) {
    return 'categories';
  }
  if (has(/\b(trends?|over time|changed|change over|history|month over month|growth|last \d+ months|past \d+ months)\b/)) {
    return 'trend';
  }
  if (has(/\b(tips?|advice|save more|saving money|how (can|do|should) i save|reduce|cut down|suggest\w*)\b/)) return 'tips';
  if (
    has(/\b(how much|spent|spend|spending|balance|income|earned|summary|overview|total|net|savings|how am i doing|status|this month|last month)\b/)
  ) {
    return 'summary';
  }
  return 'fallback';
}

/**
 * Learn: original articles on saving and investing for people in India.
 *
 * They are general education, written for Kosha. They avoid quoting tax slabs, interest rates or
 * product returns that change over time, and say where to check the current figure instead.
 * Each article is plain data (no HTML): a list of blocks the app renders itself.
 *
 *   { type: 'h2' | 'p', text }
 *   { type: 'ul' | 'ol', items: [...] }
 *   { type: 'callout', tone: 'tip' | 'warn' | 'note', title, text }
 */

const SEBI_INVESTOR = { label: 'SEBI Investor Website: investor education', url: 'https://investor.sebi.gov.in/' };
const AMFI = { label: 'AMFI: Association of Mutual Funds in India', url: 'https://www.amfiindia.com/' };
const RBI_KEHTA = { label: 'RBI Kehta Hai: financial awareness from the RBI', url: 'https://rbikehtahai.rbi.org.in/' };
const INCOME_TAX = { label: 'Income Tax Department of India', url: 'https://www.incometax.gov.in/' };
const NSE = { label: 'National Stock Exchange of India', url: 'https://www.nseindia.com/' };
const BSE = { label: 'BSE India', url: 'https://www.bseindia.com/' };
const IRDAI = { label: 'IRDAI: insurance regulator', url: 'https://www.irdai.gov.in/' };
const CYBERCRIME = { label: 'National Cyber Crime Reporting Portal', url: 'https://cybercrime.gov.in/' };
const NPCI = { label: 'NPCI: UPI safety and awareness', url: 'https://www.npci.org.in/' };
const CIBIL = { label: 'TransUnion CIBIL: credit scores and reports', url: 'https://www.cibil.com/' };
const SCORES = { label: 'SCORES: SEBI complaints redress system', url: 'https://scores.sebi.gov.in/' };

export const ARTICLES = [
  {
    slug: 'emergency-fund',
    title: 'Build an emergency fund before you invest a rupee',
    summary: 'A cash cushion for job loss, medical bills and sudden repairs keeps one bad month from becoming years of debt. Here is how big it should be and where to keep it.',
    domain: 'saving',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Aim for three to six months of essential spending, and more if your income is uneven.',
      'Keep it where you can reach it in a day and where it cannot fall in value: a savings account or a liquid option.',
      'Build it first, even slowly. Investments are for money you will not need next month.',
    ],
    copilotPrompt: 'Using my last six months of spending, how big should my emergency fund be, and how long would it take to build at my current savings rate?',
    sources: [RBI_KEHTA, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `Most money trouble starts with a surprise: a layoff, a hospital bill, a laptop that dies the week before an exam. If you have no cushion, the surprise goes on a credit card or into a loan, and the interest on that costs more than most investments earn. An emergency fund is the money that stops that from happening.` },
      { type: 'h2', text: 'How much is enough?' },
      { type: 'p', text: `A common rule of thumb is three to six months of essential spending. Essential means rent or EMI, groceries, utilities, insurance premiums, transport and minimum loan payments. It does not include dining out or shopping. If your monthly essentials are ₹40,000, six months is ₹2,40,000.` },
      { type: 'ul', items: [
        `Three months can be enough if you have a stable salary, no dependants and good health cover.`,
        `Aim closer to six months, or more, if you are self-employed, paid on commission, or support family.`,
        `If that number feels far away, start with one month. A small fund still stops most small surprises.`,
      ] },
      { type: 'h2', text: 'Where to keep it' },
      { type: 'p', text: `Two things matter: you can get to the money quickly, and its value does not swing. A savings account is the simplest. Some people keep part of it in a bank fixed deposit that can be broken early, or in a liquid mutual fund that usually pays out within a working day. Equity shares and equity funds are the wrong home for this money, because they can fall just when you need to sell.` },
      { type: 'callout', tone: 'tip', title: 'Keep it separate', text: `Put the fund in its own account, or at least give it a name. Money that sits in your everyday account tends to get spent.` },
      { type: 'h2', text: 'How to build it' },
      { type: 'ol', items: [
        `Work out your essential monthly spending. Kosha's analytics shows what you actually spent, which is better than a guess.`,
        `Set a target in months, then convert it to rupees.`,
        `Automate a fixed transfer on salary day, even if it is small.`,
        `Add windfalls such as bonuses or refunds, until you reach the target.`,
      ] },
      { type: 'p', text: `When you use the fund, refill it before you restart investing. That is its whole job.` },
      { type: 'callout', tone: 'note', title: 'Health and life cover come first', text: `An emergency fund covers a few months of cash flow. It will not pay a large hospital bill. Adequate health insurance is the other half of the cushion.` },
    ],
  },

  {
    slug: 'budget-50-30-20',
    title: 'A budget you can keep: the 50/30/20 rule, adapted for India',
    summary: 'Split take-home pay into needs, wants and savings, then adjust the ratios for rent, EMIs and family commitments. A simple frame beats a perfect spreadsheet you abandon.',
    domain: 'saving',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Start from take-home pay and give every rupee a job: needs, wants, or savings and debt repayment.',
      'The 50/30/20 split is a starting point. In an expensive city, 60/20/20 can be honest and still works.',
      'Pay yourself first: move the savings share out on salary day, then budget the rest.',
    ],
    copilotPrompt: 'Compare my last month of spending to a 50/30/20 split. Which of my categories are needs and which are wants, and where could I trim?',
    sources: [RBI_KEHTA, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `A budget is a plan for your money made before the month starts, not a report written after it ends. The 50/30/20 rule is popular because it fits on a sticky note: half of your take-home pay for needs, thirty percent for wants, and twenty percent for savings and paying down debt.` },
      { type: 'h2', text: 'What goes where' },
      { type: 'ul', items: [
        `Needs: rent or home-loan EMI, groceries, utilities, transport to work, insurance premiums, children's fees and minimum payments on loans.`,
        `Wants: eating out, streaming, travel, upgrades, gifts and anything you could pause without real harm.`,
        `Savings and debt: your emergency fund, investments, and any loan payment above the minimum.`,
      ] },
      { type: 'p', text: `On a take-home of ₹60,000 the rule gives ₹30,000 to needs, ₹18,000 to wants and ₹12,000 to savings. Use the amount that lands in your bank account, after tax and provident fund deductions.` },
      { type: 'h2', text: 'Adapting it' },
      { type: 'p', text: `In Mumbai, Bengaluru or Delhi, rent alone can use half of a salary. That does not mean the rule has failed. Try 60/20/20, or 60/15/25 if you are clearing an expensive loan. What matters is that savings are a fixed line in the plan, not whatever is left. Families who send money home can treat that as a need, and say so on paper.` },
      { type: 'callout', tone: 'tip', title: 'Pay yourself first', text: `Set up the savings transfer for the day your salary arrives. Spending then happens from what remains, and you do not have to rely on willpower at the end of the month.` },
      { type: 'h2', text: 'Make it work in Kosha' },
      { type: 'ol', items: [
        `Look at last month's spending by category and label each one a need or a want.`,
        `Set a monthly budget for the three or four categories that surprise you most.`,
        `Check the budget bars mid-month. A warning at 75% leaves time to adjust.`,
        `Once a quarter, revisit the split as your income and costs change.`,
      ] },
      { type: 'p', text: `Expect to miss some months. A budget that you adjust is working. A budget that you quit after one overspend is not.` },
    ],
  },

  {
    slug: 'inflation-and-real-returns',
    title: 'Inflation quietly shrinks your savings. Think in real returns',
    summary: 'At 6% inflation, ₹1,00,000 buys about ₹56,000 worth of goods after ten years. Compare any return with inflation, not with zero.',
    domain: 'investing',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'A return only matters after inflation. Real return is roughly the return you earn minus inflation.',
      'Cash and low-interest accounts are safe from market swings but not from rising prices.',
      'Longer goals need some growth assets, because prices keep rising while you wait.',
    ],
    copilotPrompt: 'Explain real returns to me, and show how inflation would change what my monthly spending looks like in ten years.',
    sources: [RBI_KEHTA, { label: 'Ministry of Statistics (MoSPI): CPI data', url: 'https://www.mospi.gov.in/' }],
    body: [
      { type: 'p', text: `Prices rise over time. A cup of tea, a bus ticket and a school fee all cost more than they did ten years ago. Inflation is the pace of that rise, and it works on your savings whether you notice it or not.` },
      { type: 'h2', text: 'A worked example' },
      { type: 'p', text: `Suppose prices rise 6% a year. Something that costs ₹1,00,000 today will cost about ₹1,79,000 in ten years. Turned around, ₹1,00,000 kept in a drawer would buy only what ₹56,000 buys today. The rupees are all still there. Their power to buy things has shrunk.` },
      { type: 'h2', text: 'Real return' },
      { type: 'p', text: `If your deposit earns 7% and inflation is 6%, your real return is roughly 1%. If it earns 5%, your real return is negative: you are slowly getting poorer in what you can buy. The calculation is only approximate, but it makes the point: always compare a return with inflation.` },
      { type: 'ul', items: [
        `The Reserve Bank of India aims to keep consumer price inflation around 4%, within a band of 2% to 6%.`,
        `Your own inflation can differ. Rent, school fees and healthcare often rise faster than the headline number.`,
        `Inflation also raises the cost of your future goals, such as a child's education, so plan with higher figures.`,
      ] },
      { type: 'callout', tone: 'warn', title: 'Safe is not the same as risk-free', text: `Keeping everything in a savings account removes the risk of a market fall, and replaces it with the certainty that prices will rise. Over long periods that certainty matters.` },
      { type: 'h2', text: 'What to do with this' },
      { type: 'ol', items: [
        `Keep money for the next one to two years in safe, easy-to-reach places.`,
        `For goals five years or more away, learn about growth assets such as equity funds, and the ups and downs that come with them.`,
        `When someone quotes a return, ask what it is after inflation, and after tax and costs.`,
      ] },
      { type: 'p', text: `This is general education, not a recommendation for any product. How much growth risk suits you depends on your goals, your timeline and how you would feel in a bad year.` },
    ],
  },

  {
    slug: 'compounding-and-sip',
    title: 'Compounding and the SIP: why starting early matters more than starting big',
    summary: 'Returns earn their own returns. A fixed monthly SIP shows how time does most of the work, and why a few extra years can matter more than a bigger amount.',
    domain: 'investing',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Compounding means growth is added to your money, and then that bigger amount grows too.',
      'A SIP invests a fixed amount at regular intervals, which builds the habit and averages your purchase price.',
      'The figures here are an illustration at an assumed rate. Real returns vary and can be negative in some years.',
    ],
    copilotPrompt: 'If I saved a fixed amount each month from my income, how much would I need to set aside to reach a goal in ten years? Explain it simply and mention the assumptions.',
    sources: [AMFI, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `Compounding is growth on growth. If ₹1,00,000 grows 12% in a year, you have ₹1,12,000. The next year the 12% applies to ₹1,12,000, not to the original ₹1,00,000. Left alone for twenty years at that assumed rate, ₹1,00,000 becomes about ₹9.6 lakh.` },
      { type: 'h2', text: 'What a SIP is' },
      { type: 'p', text: `A systematic investment plan, or SIP, sends a fixed amount from your bank account into a mutual fund on a set date each month. You do not need a large lump sum, and you do not have to decide when to buy. Because the amount is fixed, you get more units when the price is low and fewer when it is high, which smooths out your average cost.` },
      { type: 'h2', text: 'Time beats amount' },
      { type: 'p', text: `Consider ₹5,000 a month at an assumed 12% a year, compounded monthly. This is an illustration, not a forecast.` },
      { type: 'ul', items: [
        `After 10 years: you have put in ₹6 lakh, and the pot would be about ₹11.5 lakh.`,
        `After 20 years: you have put in ₹12 lakh, and the pot would be about ₹49.5 lakh.`,
        `After 30 years: you have put in ₹18 lakh, and the pot would be about ₹1.75 crore.`,
      ] },
      { type: 'p', text: `The last ten years add far more than the first ten, even though you paid in the same amount each month. That is why a 25-year-old investing a modest sum can end up ahead of a 40-year-old investing much more.` },
      { type: 'callout', tone: 'warn', title: 'Returns are not steady', text: `Real investments do not earn 12% every year. Equity funds can fall sharply, sometimes for years. A SIP does not remove that risk. Only invest money you will not need for the period you are planning.` },
      { type: 'h2', text: 'Practical steps' },
      { type: 'ol', items: [
        `Build your emergency fund first, so you are never forced to stop or sell in a bad month.`,
        `Choose an amount you can sustain through the whole plan, and set it to auto-debit just after salary day.`,
        `Review once or twice a year. Raise the amount when your income rises.`,
        `Do not stop in a market fall out of fear. Decide your plan in a calm moment and stick to it.`,
      ] },
    ],
  },

  {
    slug: 'asset-allocation',
    title: 'Asset allocation in plain words: equity, debt and gold',
    summary: 'How you split money between growth, stability and a hedge matters more than which single product you pick. Learn the three buckets and how your timeline changes the mix.',
    domain: 'investing',
    level: 'intermediate',
    updated: '2026-11-01',
    takeaways: [
      'Asset allocation is how you divide money between growth assets (equity), stable assets (debt) and others such as gold.',
      'The mix should follow your goal dates and your ability to sit through a fall, not recent headlines.',
      'Rebalancing once a year keeps the risk you chose from drifting.',
    ],
    copilotPrompt: 'Explain asset allocation to me. Based on how much I save each month, what questions should I answer to decide a mix for a five-year goal versus a twenty-year goal?',
    sources: [SEBI_INVESTOR, AMFI],
    body: [
      { type: 'p', text: `Picking a good fund matters less than people think. How you divide your money between different kinds of assets usually has a bigger effect on how rough the ride is. That division is called asset allocation.` },
      { type: 'h2', text: 'The three common buckets' },
      { type: 'ul', items: [
        `Equity: shares of companies, or funds that hold them. Long-run growth potential, with large swings along the way.`,
        `Debt: fixed deposits, bonds, PPF, debt mutual funds. Steadier, lower expected growth, and not free of risk. Credit and interest-rate risk exist.`,
        `Gold: a store of value that often behaves differently from shares, but pays no income and can stay flat for years.`,
      ] },
      { type: 'h2', text: 'Let the goal date decide' },
      { type: 'p', text: `Money you need in under three years should not depend on the stock market, because a fall can arrive just before you need to spend. Goals ten or twenty years away can tolerate more equity, because there is time to recover. A rough guide: the closer the date, the more you move toward stable assets.` },
      { type: 'callout', tone: 'note', title: 'Your temperament counts', text: `A mix that looks right on paper but makes you sell in a panic is the wrong mix. Pick an allocation you could hold through a fall of a third in the equity part.` },
      { type: 'h2', text: 'Rebalancing' },
      { type: 'p', text: `Say you want 60% equity and 40% debt. After a strong year for shares, you might be at 70/30, which means you are carrying more risk than you chose. Once a year, bring it back by directing new money to the lagging part, or by selling a little of the part that grew. Check the tax effect before selling.` },
      { type: 'h2', text: 'Questions to ask yourself' },
      { type: 'ol', items: [
        `When will I need this money, and is the date fixed?`,
        `If this fell 30% next year, would I still be able to wait?`,
        `Do I already have an emergency fund and enough insurance?`,
        `Is my income steady, or does it swing?`,
      ] },
      { type: 'p', text: `These answers shape your mix far more than a hot tip does. This article is general education. A SEBI-registered investment adviser can look at your own situation.` },
    ],
  },

  {
    slug: 'nifty-sensex-basics',
    title: 'Nifty, Sensex and the exchanges: how the Indian stock market is organised',
    summary: 'NSE and BSE are the two main exchanges. The Nifty 50 and Sensex are baskets that summarise how large companies are doing. Here is what the numbers on the news mean.',
    domain: 'stocks',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'A stock exchange is a marketplace where shares are bought and sold. India has two main ones, NSE and BSE.',
      'The Nifty 50 (NSE) and the Sensex (BSE) are indices: weighted baskets of large companies, not stocks you can buy directly.',
      'To trade you need a demat account and a trading account with a SEBI-registered broker.',
    ],
    copilotPrompt: 'Explain the difference between the Nifty 50 and the Sensex, and what it means when the news says the market is up or down.',
    sources: [NSE, BSE, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `When a company wants to raise money from the public, it lists its shares on a stock exchange. After that, anyone can buy or sell those shares there. In India the two main exchanges are the National Stock Exchange (NSE) and the Bombay Stock Exchange (BSE). The market regulator, SEBI, sets the rules for both.` },
      { type: 'h2', text: 'What an index tells you' },
      { type: 'p', text: `Reading the price of thousands of shares is not practical, so exchanges publish an index: a single number that tracks a chosen basket of companies. The Nifty 50 follows 50 large companies on the NSE. The Sensex follows 30 large companies on the BSE. When people say the market rose today, they usually mean one of these moved up.` },
      { type: 'ul', items: [
        `Companies with a larger market value have a bigger influence on the index.`,
        `There are also indices for banks, IT, mid-sized and small companies, so you can see which part of the market is moving.`,
        `A plain index tracks prices only. A total return index adds dividends, so it grows slightly faster over time.`,
      ] },
      { type: 'h2', text: 'How a trade happens' },
      { type: 'ol', items: [
        `You open a demat account, which holds your shares electronically, and a trading account with a registered broker.`,
        `You place an order for a share at a price you choose, or at the market price.`,
        `The exchange matches your order with a seller. Trades settle one working day later (T+1), when shares reach your demat account.`,
      ] },
      { type: 'callout', tone: 'note', title: 'Prices here are end-of-day', text: `Kosha's Markets pages use the exchange's official end-of-day files, so they show the last close and not a live price. Do not use them to time a trade.` },
      { type: 'h2', text: 'Why this matters to you' },
      { type: 'p', text: `Even if you never buy a share, the market affects you. Index funds follow these baskets, your provident fund and insurance may hold equity, and the news will quote them. Knowing what the numbers are makes those headlines less mysterious.` },
    ],
  },

  {
    slug: 'reading-a-stock-page',
    title: 'How to read a stock page: price, market cap, P/E and what they leave out',
    summary: 'A share price alone says nothing about value. Market capitalisation, the P/E ratio and the range of past returns give context. Each one also has blind spots.',
    domain: 'stocks',
    level: 'intermediate',
    updated: '2026-11-01',
    takeaways: [
      'The price of one share is not comparable across companies. Look at market cap and valuation instead.',
      'P/E compares price with earnings. A low P/E is not automatically cheap, and a high one is not automatically expensive.',
      'Past returns describe what happened. They do not predict what comes next.',
    ],
    copilotPrompt: 'Explain how to read a stock page: market cap, P/E, day change and past returns. Use a large Nifty 50 company as an example and point out what each number cannot tell me.',
    sources: [SEBI_INVESTOR, NSE],
    body: [
      { type: 'p', text: `A share that costs ₹3,000 is not more expensive than one that costs ₹30. What you pay depends on how many shares exist and what the business earns. These are the numbers a stock page typically shows, and what to keep in mind about each.` },
      { type: 'h2', text: 'Price and day change' },
      { type: 'p', text: `The close is the last traded price of the day. The day change compares it with the previous close, as a rupee amount and a percentage. A one-day move says very little. Most daily changes are noise.` },
      { type: 'h2', text: 'Market capitalisation' },
      { type: 'p', text: `Market cap is the share price multiplied by the number of shares in existence. It is the market's current value for the whole company. In India, the top 100 companies by market cap are called large caps, the next 150 mid caps, and the rest small caps. Smaller companies can grow faster, and they can also fall further and be harder to sell.` },
      { type: 'h2', text: 'The P/E ratio' },
      { type: 'p', text: `P/E is the price divided by the earnings per share over the last year. A P/E of 25 means you pay ₹25 for every ₹1 of yearly profit. Compare P/E with companies in the same industry and with the company's own history. Banks, IT firms and power companies are valued differently, so comparing across them can mislead.` },
      { type: 'ul', items: [
        `A very low P/E may mean the market expects profits to fall.`,
        `A very high P/E may mean the market expects rapid growth that may not arrive.`,
        `Earnings can be unusual in one year, which distorts the ratio.`,
      ] },
      { type: 'h2', text: 'Past returns' },
      { type: 'p', text: `Returns over one month, six months or a year show how the price has moved. Prices are not adjusted for stock splits or bonus issues on some views, which can make a fall look larger than it was. Read them as history, and never as a promise.` },
      { type: 'callout', tone: 'warn', title: 'What the page does not show', text: `Debt, the quality of management, competition, and how the company makes money are not visible in a few numbers. Read the company's annual report before you decide anything.` },
    ],
  },

  {
    slug: 'mutual-fund-basics',
    title: 'Mutual funds explained: NAV, expense ratio, direct vs regular and the riskometer',
    summary: 'A mutual fund pools money from many people and invests it for them. Learn how the price is set, what you pay in fees, and how to read the risk label before you look at returns.',
    domain: 'funds',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'NAV is the price of one unit of the fund, worked out once a day from the value of everything it holds.',
      'The expense ratio is a yearly cost taken from the fund. Direct plans charge less than regular plans because there is no distributor commission.',
      'Look at the riskometer and the fund category first. Returns come second, and past returns do not guarantee future ones.',
    ],
    copilotPrompt: 'Explain how to compare two mutual funds: NAV, expense ratio, direct vs regular, riskometer and rolling returns. What should I look at first?',
    sources: [AMFI, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `A mutual fund collects money from many investors and a professional fund manager invests it in shares, bonds or other assets, following the fund's stated aim. You own units of the fund, and the value of each unit moves with the assets underneath.` },
      { type: 'h2', text: 'NAV: the price of a unit' },
      { type: 'p', text: `Net asset value, or NAV, is the total value of the fund's assets minus its costs, divided by the number of units. It is calculated once after the market closes each working day. A fund with a NAV of ₹20 is not cheaper than one at ₹200. What matters is the percentage the NAV changes, not its size.` },
      { type: 'h2', text: 'Costs' },
      { type: 'p', text: `Every fund charges an annual expense ratio, a percentage of your money deducted inside the NAV. It looks small, but over twenty years the difference between 0.5% and 1.5% a year adds up to a meaningful sum. Each fund is offered in two plans.` },
      { type: 'ul', items: [
        `Direct plan: you buy straight from the fund house. The expense ratio is lower.`,
        `Regular plan: you buy through a distributor who earns a commission, paid from the expense ratio, so costs are higher.`,
      ] },
      { type: 'h2', text: 'Risk first' },
      { type: 'p', text: `SEBI requires every scheme to show a riskometer with six levels, from low to very high. A small-cap equity fund will be marked very high, and a liquid fund low to moderate. Pick the risk level you can live with before you compare returns, because a fund that suits someone else's goal and stomach may not suit yours.` },
      { type: 'h2', text: 'Reading performance' },
      { type: 'ul', items: [
        `Look at 3 and 5 year returns before 1 year. One good year can flatter a fund.`,
        `Compare a fund with its own category and its benchmark index, not with funds of another type.`,
        `Remember that past returns do not guarantee future ones.`,
      ] },
      { type: 'callout', tone: 'note', title: 'The standard warning', text: `Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing.` },
    ],
  },

  {
    slug: 'index-vs-active-funds',
    title: 'Index funds or active funds? What each one tries to do',
    summary: 'An index fund copies a benchmark at low cost. An active fund tries to beat it and charges more for the attempt. Understand the trade-off before choosing.',
    domain: 'funds',
    level: 'intermediate',
    updated: '2026-11-01',
    takeaways: [
      'An index fund holds the companies in an index in the same proportion, so it earns roughly what the index earns, minus a small cost.',
      'An active fund tries to beat its benchmark. That costs more, and many funds do not manage it over long periods in some categories.',
      'Cost, time horizon and your own discipline often matter more than the label.',
    ],
    copilotPrompt: 'Explain the difference between an index fund and an active fund. What should I check before choosing between them, such as expense ratio and tracking error?',
    sources: [AMFI, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `When you choose a mutual fund, one of the first choices is whether it follows an index or tries to beat it. Neither approach is right for everyone. Knowing what each is trying to do helps you judge the claims made for it.` },
      { type: 'h2', text: 'Index funds' },
      { type: 'p', text: `An index fund buys the companies in an index, such as the Nifty 50, in the same proportions. There is no fund manager choosing stocks, so the cost is low. The result is close to the index's return, less the expense ratio and a small gap called tracking error.` },
      { type: 'ul', items: [
        `Low costs, often a fraction of an active fund's.`,
        `Simple to understand and hard to get badly wrong.`,
        `You never beat the market, and you take all its falls.`,
      ] },
      { type: 'h2', text: 'Active funds' },
      { type: 'p', text: `An active fund's manager chooses which companies to hold, aiming to beat a benchmark. A good manager may add value, particularly in less-researched parts of the market such as small and mid-sized companies. But you pay a higher expense ratio every year, whether or not they succeed.` },
      { type: 'p', text: `Independent studies, such as the S&P SPIVA scorecards for India, have repeatedly found that many active large-cap funds trail their benchmark over long periods. Results differ between categories and time periods, and a fund that wins in one period often does not in the next.` },
      { type: 'h2', text: 'How to decide' },
      { type: 'ol', items: [
        `Compare the expense ratio of the direct plan.`,
        `For active funds, check returns over 5 years or more against the benchmark, in more than one market cycle.`,
        `For index funds, compare tracking error and the size of the fund.`,
        `Ask whether you would stay invested if the fund lagged for two years. If not, the lower-cost, simpler option may suit you better.`,
      ] },
      { type: 'callout', tone: 'tip', title: 'It does not have to be either-or', text: `Many people use index funds for the core of their portfolio and a small active portion for areas where they believe skill helps. Keep the total number of funds small enough to understand.` },
    ],
  },

  {
    slug: 'tax-records-and-regimes',
    title: 'Tax basics for salaried people: records, regimes and what to check each year',
    summary: 'Tax rules change with every Budget, so this guide skips the numbers and covers what lasts: the paperwork to keep, how to compare regimes, and how investing gains are taxed in principle.',
    domain: 'tax',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Keep Form 16, your Annual Information Statement and proof of investments and rent in one folder every year.',
      'Compare the tax regimes with your own numbers each year, because the better one can change when your income or deductions change.',
      'How long you hold an investment affects how its gain is taxed. Check the current rules on the official site before you sell.',
    ],
    copilotPrompt: 'Help me organise my records for tax filing. Which of my transactions in Kosha look like income, and what documents should I collect?',
    sources: [INCOME_TAX],
    body: [
      { type: 'p', text: `Tax rates, slabs and limits change often, and the law itself has been rewritten. Instead of quoting figures that may be out of date by the time you read them, this guide covers what stays the same, and points you to the official source for the numbers.` },
      { type: 'callout', tone: 'warn', title: 'Check the current rules', text: `Always confirm slabs, limits and due dates on incometax.gov.in or with a qualified tax professional. Kosha does not give tax advice.` },
      { type: 'h2', text: 'Keep a yearly folder' },
      { type: 'ul', items: [
        `Form 16 from your employer, and salary slips.`,
        `The Annual Information Statement and Form 26AS from the tax portal, which show what has been reported against your PAN.`,
        `Interest certificates from banks and any statements from brokers or fund houses.`,
        `Proof of rent, insurance premiums, loan interest and any deduction you plan to claim.`,
      ] },
      { type: 'h2', text: 'Compare the regimes' },
      { type: 'p', text: `Individual taxpayers have generally been offered two ways to compute tax: one with a lower rate and few deductions, and one with higher rates and many deductions. Which one costs less depends on how much you actually claim. Do the sum with your own figures every year. Do not assume last year's answer still holds.` },
      { type: 'h2', text: 'How investment gains are taxed in principle' },
      { type: 'p', text: `Profit on shares and mutual funds is a capital gain. The rate usually depends on the type of asset and on how long you held it, with different treatment for short and long holding periods. Interest from deposits is generally added to your income and taxed at your slab rate. Because these rules are revised in Budgets, look up the current rate before you sell, and keep a record of purchase dates and prices.` },
      { type: 'h2', text: 'Habits that save trouble' },
      { type: 'ol', items: [
        `Match your AIS against your own records and report any mistakes.`,
        `File before the deadline, even when no tax is due.`,
        `Declare every source of income, including interest and freelance receipts.`,
        `Keep documents for several years in case of a query.`,
      ] },
    ],
  },

  {
    slug: 'term-and-health-insurance',
    title: 'Insurance comes first: term life and health cover',
    summary: 'Insurance pays for the big losses that savings cannot. A term plan protects dependants if you die, and health cover keeps one hospital stay from emptying your savings.',
    domain: 'protection',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Buy term insurance only if someone depends on your income, and size the cover to replace that income for years.',
      'Health insurance is separate from any cover your employer gives, which ends if you leave the job.',
      'Keep protection and investing apart. Compare the cost and flexibility of any plan that combines the two.',
    ],
    copilotPrompt: 'Based on my income and spending in Kosha, roughly how many years of expenses would a term cover need to replace? Explain how to think about it, without recommending a product.',
    sources: [IRDAI, SEBI_INVESTOR],
    body: [
      { type: 'p', text: `Savings and investments build wealth slowly. Insurance does a different job: it pays a large sum quickly when something rare and expensive happens. Without it, one illness or one death in the family can wipe out years of saving.` },
      { type: 'h2', text: 'Term life insurance' },
      { type: 'p', text: `A term plan pays a fixed sum to your family if you die during the term, and pays nothing if you outlive it. Because there is no savings element, the premium is low for the cover you get. It makes sense when others rely on your income, such as a spouse, children or parents.` },
      { type: 'ul', items: [
        `A common rule of thumb is cover of 10 to 15 times your annual income, adjusted for your loans and dependants.`,
        `Buy while you are young and healthy, since the premium is lower and stays fixed for the term.`,
        `Be accurate about your health and habits when you apply. A wrong answer can lead to a rejected claim.`,
      ] },
      { type: 'h2', text: 'Health insurance' },
      { type: 'p', text: `A hospital stay can cost more than a year's savings. A health policy pays the bills, usually for admissions of more than a day, up to the sum insured. Compare these points between policies.` },
      { type: 'ul', items: [
        `Sum insured, and whether it is enough in a big city's private hospital.`,
        `Waiting periods for pre-existing conditions, and sub-limits on room rent or procedures.`,
        `Network hospitals near you, and whether cashless claims are available.`,
        `Co-payment clauses, where you pay a share of every claim.`,
      ] },
      { type: 'callout', tone: 'warn', title: 'Employer cover is not enough', text: `A group policy from your employer usually ends when you leave, just when you may be between jobs. Keep a personal policy as well.` },
      { type: 'h2', text: 'Keep it simple' },
      { type: 'p', text: `Plans that mix insurance and investment can be harder to compare, since you need to judge the cover and the returns together. Many people prefer pure term cover plus separate investments. Ask for the policy document and the charges in writing, and read them before you pay. The insurance regulator, IRDAI, publishes consumer information and a complaints route.` },
    ],
  },

  {
    slug: 'credit-score-and-cards',
    title: 'Credit scores and credit cards without the debt trap',
    summary: 'Your credit score is a number lenders use to decide whether to lend to you and at what rate. A card is a useful tool if you pay in full, and an expensive loan if you do not.',
    domain: 'credit',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'A credit score from 300 to 900 summarises how reliably you have repaid. Higher is better.',
      'Pay the full statement amount by the due date. Card interest is among the highest a household can pay.',
      'Keep your usage well below your limit, and check your free credit report for errors once a year.',
    ],
    copilotPrompt: 'Look at my recent spending and tell me how much I could safely put on a credit card each month and still pay it in full from my income.',
    sources: [CIBIL, RBI_KEHTA],
    body: [
      { type: 'p', text: `When you ask for a loan or a credit card, the lender checks your credit report. It lists the loans and cards you have, whether you paid on time, and how much of your limit you use. A score, usually between 300 and 900, summarises it. A higher score helps you get approved and often lowers the interest you are offered.` },
      { type: 'h2', text: 'What moves the score' },
      { type: 'ul', items: [
        `Payment history: late or missed payments hurt the most.`,
        `Credit utilisation: using most of your card limit looks risky. Many people aim to stay under about 30%.`,
        `Length of history: older accounts in good standing help.`,
        `New applications: several in a short time can lower the score for a while.`,
        `Mix: some experience with both cards and loans is a small plus.`,
      ] },
      { type: 'h2', text: 'The cost of not paying in full' },
      { type: 'p', text: `If you pay only the minimum due, the rest carries interest that is often around 3% a month or more. That is over 36% a year before you count late fees and tax. A purchase of ₹20,000 left unpaid for a few months can cost thousands extra. The cheapest way to use a card is to pay the whole statement balance each month.` },
      { type: 'callout', tone: 'tip', title: 'Make it automatic', text: `Set auto-pay for the full statement balance, and keep that amount in your account. Missing a due date is the most common way a good score slips.` },
      { type: 'h2', text: 'Good habits' },
      { type: 'ol', items: [
        `Treat the card like a debit card: only spend what you could pay from your account today.`,
        `Do not withdraw cash on a credit card. It starts charging interest immediately.`,
        `Check your credit report once a year for accounts you do not recognise, and dispute errors.`,
        `Think before closing your oldest card. A long history helps your score.`,
      ] },
      { type: 'p', text: `Loan offers that arrive by message are not a reason to borrow. Borrow when you have a clear reason and a repayment plan.` },
    ],
  },

  {
    slug: 'investment-scams',
    title: 'Spotting investment scams: promised returns, tip groups and fake apps',
    summary: 'Fraudsters use guaranteed returns, urgency and fake trading apps to take savings. Learn the warning signs, how to check an adviser, and what to do if you have been targeted.',
    domain: 'safety',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'Real investments cannot guarantee high returns. A promise of one is a red flag.',
      'Be wary of unknown people who add you to WhatsApp or Telegram groups with stock tips.',
      'Check that an adviser or broker is registered with SEBI, and report fraud quickly on 1930 or at cybercrime.gov.in.',
    ],
    copilotPrompt: 'Give me a short checklist to decide whether an investment offer I received is a scam, and tell me where to verify it in India.',
    sources: [SEBI_INVESTOR, SCORES, CYBERCRIME],
    body: [
      { type: 'p', text: `Investment fraud works because it feels like an opportunity. A stranger, or a friendly voice in a group chat, shows screenshots of big profits and says you can do the same. The patterns repeat, which means you can learn to spot them.` },
      { type: 'h2', text: 'Common warning signs' },
      { type: 'ul', items: [
        `Guaranteed or fixed high returns, especially with phrases like risk-free or double your money.`,
        `Pressure to act today, or a limited offer that closes soon.`,
        `Unknown people who add you to a group, or message first, offering stock tips or insider information.`,
        `An app or website that is not from a known broker, which asks you to transfer money to a personal account.`,
        `Early small withdrawals that work, then a demand for fees or tax before you can take out the big sum.`,
      ] },
      { type: 'callout', tone: 'warn', title: 'Screenshots prove nothing', text: `Profit screenshots and testimonials are easy to fake. Do not treat them as evidence.` },
      { type: 'h2', text: 'Check before you pay' },
      { type: 'ol', items: [
        `Look up the person or firm on the SEBI website. Stockbrokers, investment advisers and research analysts must be registered.`,
        `Download trading apps only from your broker's official page, and check the broker on the exchange's website.`,
        `Pay only into the broker's official, named account. Never into a personal account or a wallet.`,
        `Ask yourself why a stranger would share a profitable secret for free.`,
      ] },
      { type: 'h2', text: 'If something goes wrong' },
      { type: 'p', text: `Act fast. Call the National Cyber Crime Helpline on 1930 and file a report at cybercrime.gov.in. Tell your bank right away, as speed improves the chance of freezing the money. If a registered intermediary is involved, you can lodge a complaint on SEBI's SCORES portal. Do not pay any further fees to recover your money, since that is a second scam.` },
      { type: 'p', text: `Talking to someone you trust before you invest is a good habit. Fraud depends on you acting alone and in a hurry.` },
    ],
  },

  {
    slug: 'upi-safety',
    title: 'Using UPI safely: PINs, collect requests and fake customer care',
    summary: 'UPI is fast and convenient, and fraudsters rely on tricking you into approving payments. A handful of rules block most common scams.',
    domain: 'safety',
    level: 'beginner',
    updated: '2026-11-01',
    takeaways: [
      'You never need to enter your UPI PIN to receive money. If an app asks for it, you are paying.',
      'Never approve a collect request or scan a QR code to get a refund or a prize.',
      'Search for customer care on the official app or website, not in a search result or a message.',
    ],
    copilotPrompt: 'List the most common UPI scams in India and the simple habits that protect me from them. Then check whether any of my recent transactions look unusual.',
    sources: [NPCI, CYBERCRIME, RBI_KEHTA],
    body: [
      { type: 'p', text: `UPI turned payments into a few taps. The same speed is what scammers use, because a payment you approve cannot easily be taken back. Most UPI frauds do not hack anything. They persuade you to approve something yourself.` },
      { type: 'h2', text: 'The rules that block most scams' },
      { type: 'ul', items: [
        `Your UPI PIN is for sending money only. Receiving money never needs a PIN, a QR scan or an approval.`,
        `Never share your PIN, a one-time password or your card details with anyone, including someone claiming to be from your bank.`,
        `Read each approval screen. Check the name, the amount and whether it says you are paying.`,
        `Be cautious with collect requests from people you do not know.`,
      ] },
      { type: 'h2', text: 'Scams to recognise' },
      { type: 'ul', items: [
        `The refund or prize trick: a buyer or a caller asks you to scan a code to receive money. Scanning pays them.`,
        `Fake customer care: a number found in a search result or a post, from someone who asks you to install a remote-access app.`,
        `Wrong-payment calls: someone says they sent you money by mistake and asks you to send it back, before the original payment has fully cleared.`,
        `Lookalike names: a payee with a name almost the same as a shop or a friend.`,
      ] },
      { type: 'callout', tone: 'tip', title: 'Pause when rushed', text: `Scams add urgency: your account will be blocked, the offer ends now. A real bank will not mind if you hang up and call back on the number printed on your card.` },
      { type: 'h2', text: 'If you have paid a scammer' },
      { type: 'ol', items: [
        `Call 1930, the national cyber crime helpline, as soon as you can.`,
        `Report it at cybercrime.gov.in and tell your bank to block further debits.`,
        `Keep screenshots, transaction IDs and phone numbers as evidence.`,
        `Change your UPI PIN and passwords, and remove any app you were asked to install.`,
      ] },
      { type: 'p', text: `Set a sensible daily limit in your UPI app and keep your phone locked with a screen lock. It takes a minute, and it limits the damage if something does go wrong.` },
    ],
  },
];

const wordCount = (article) =>
  article.body
    .flatMap((b) => (b.items ? b.items : [b.text ?? '', b.title ?? '']))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

/** Minutes to read, at about 200 words a minute, never less than one. */
export const readMinutes = (article) => Math.max(1, Math.round(wordCount(article) / 200));

/** What the list view needs: everything except the text itself. */
export function summarise(article) {
  const { slug, title, summary, domain, level, updated } = article;
  return { slug, title, summary, domain, level, updated, readMinutes: readMinutes(article) };
}

const bySlug = new Map(ARTICLES.map((a) => [a.slug, a]));

export const findArticle = (slug) => bySlug.get(slug);

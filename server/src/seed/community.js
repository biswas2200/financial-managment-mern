/**
 * Sample members and the discussions they start in Learn and Discussions, so the community is not an empty room.
 *
 * The members are made up. They have real-looking names (other members see "Priya S."), a preset icon and an email
 * on kosha.example, which cannot receive mail, and a password nobody knows, so nobody can sign in as them.
 * Everything here is plain education and habits: nobody tells anyone what to buy or sell.
 */
import { AVATAR_COLORS, AVATAR_PRESETS } from '@kosha/shared';

const member = (key, name, preset, color) => ({
  key,
  name,
  email: `${name.toLowerCase().replace(/ /g, '.')}@kosha.example`,
  avatar: { preset: AVATAR_PRESETS[preset], color: AVATAR_COLORS[color] },
});

export const COMMUNITY_MEMBERS = [
  member('priya', 'Priya Subramanian', 11, 2),
  member('rohan', 'Rohan Kulkarni', 2, 1),
  member('ananya', 'Ananya Banerjee', 5, 4),
  member('vikram', 'Vikram Rathore', 12, 6),
  member('meera', 'Meera Nair', 3, 2),
  member('arjun', 'Arjun Reddy', 13, 0),
  member('kavya', 'Kavya Menon', 7, 5),
  member('imran', 'Imran Qureshi', 4, 3),
  member('sneha', 'Sneha Patil', 6, 7),
  member('harpreet', 'Harpreet Kaur', 8, 6),
  member('nikhil', 'Nikhil Joshi', 14, 1),
  member('divya', 'Divya Iyer', 9, 4),
  member('faisal', 'Faisal Ahmed', 10, 0),
  member('tanvi', 'Tanvi Shah', 15, 3),
  member('lakshmi', 'Lakshmi Narayanan', 0, 2),
  member('rahul', 'Rahul Verma', 1, 5),
];

/**
 * Each post: who wrote it, where, how many days before the seed ran, who liked or disliked it, and the replies.
 * A reply's `afterMinutes` is how long after the post it was written.
 */
export const COMMUNITY_POSTS = [
  {
    by: 'rohan',
    space: 'saving',
    daysAgo: 3,
    title: 'How big should my emergency fund be on a variable income?',
    body: "I edit videos for a few agencies, so my month swings between about ₹35,000 and ₹90,000. Everyone says keep six months of expenses aside, but that feels vague when my own income isn't steady. How did you decide the number? Do you count rent and EMIs only, or everything?",
    likedBy: ['meera', 'arjun', 'kavya', 'tanvi', 'divya', 'harpreet'],
    comments: [
      { by: 'meera', afterMinutes: 40, body: "I took my lowest three months of the last year and treated that as my normal month, then multiplied by 8. Freelance work can go quiet for longer than a salary job takes to replace, so I wanted the extra cushion.", likedBy: ['rohan', 'arjun', 'kavya', 'priya'] },
      { by: 'arjun', afterMinutes: 95, body: "Fixed costs only for the number, I think. Rent, EMIs, premiums, groceries, phone and internet. Dining out and shopping can stop for a few months if they really have to.", likedBy: ['rohan', 'meera', 'imran'] },
      { by: 'kavya', afterMinutes: 180, body: "Two buckets worked for me. One month in the savings account for quick access, the rest somewhere boring that I can pull out in a day or two. The emergency fund article in Learn explains why that second part shouldn't sit in equity.", likedBy: ['rohan', 'sneha'] },
      { by: 'rohan', afterMinutes: 400, body: "This helps a lot. I'll start with fixed costs x 6 and push it up in the good months.", likedBy: ['meera', 'kavya'] },
    ],
  },
  {
    by: 'ananya',
    space: 'saving',
    daysAgo: 5,
    title: 'Do you log expenses daily or in one go at the end of the week?',
    body: "I've tried both. Daily feels like a chore by day ten, but weekly means I forget the small UPI payments. Curious what has actually lasted for people for more than a few months.",
    likedBy: ['nikhil', 'lakshmi', 'sneha', 'faisal', 'tanvi'],
    comments: [
      { by: 'nikhil', afterMinutes: 25, body: "Daily, but only for 30 seconds right after paying. If I leave it for the evening I forget the chai and the auto rides.", likedBy: ['ananya', 'divya'] },
      { by: 'lakshmi', afterMinutes: 130, body: "Sunday evening, ten minutes, with my UPI history open next to the app. It catches everything and I don't have to remember during the week.", likedBy: ['ananya', 'nikhil', 'imran', 'meera'] },
      { by: 'sneha', afterMinutes: 300, body: "Weekly for me too. Honestly the habit matters more than the method.", likedBy: ['lakshmi'] },
    ],
  },
  {
    by: 'vikram',
    space: 'funds',
    daysAgo: 7,
    title: 'Does the SIP date really matter?',
    body: "My SIP goes out on the 5th because that's when I set it up. A friend says the 25th or the 1st is better. Is there actually a difference over many years, or is this just noise?",
    likedBy: ['sneha', 'harpreet', 'nikhil', 'priya', 'meera', 'faisal', 'divya'],
    dislikedBy: ['arjun'],
    comments: [
      { by: 'sneha', afterMinutes: 35, body: "Over a long stretch the date mostly washes out. Some months you buy a bit higher, some months lower. I wouldn't spend any energy on this.", likedBy: ['vikram', 'harpreet', 'nikhil', 'arjun'] },
      { by: 'nikhil', afterMinutes: 150, body: "I set mine for two days after the salary credit so the money is definitely there and the SIP never bounces. That was my only reason to change it.", likedBy: ['vikram', 'sneha', 'divya'] },
      { by: 'divya', afterMinutes: 260, body: "The compounding article in Learn shows this nicely. How long you stay invested mattered far more than the date.", likedBy: ['vikram', 'nikhil'] },
      { by: 'harpreet', afterMinutes: 500, body: "Pick a date, keep it, move on. The people who keep changing it are usually the ones who stop the SIP later too.", likedBy: ['faisal'], dislikedBy: ['sneha'] },
    ],
  },
  {
    by: 'harpreet',
    space: 'funds',
    daysAgo: 9,
    title: 'Direct or regular plan: how much does the difference matter?',
    body: "My bank's relationship manager put me in regular plans. When I looked at the factsheet, the expense ratio of the direct version of the same fund was lower. Has anyone switched? What did you look at before you moved, and did you think about the tax on the switch?",
    likedBy: ['arjun', 'priya', 'vikram', 'tanvi', 'rahul', 'kavya'],
    comments: [
      { by: 'arjun', afterMinutes: 55, body: "The expense ratio gap compounds every year, so over 15 or 20 years it can be a real chunk. Do check what the switch triggers though. Moving out of a regular plan counts as a redemption, so capital gains tax may apply on what you've already made.", likedBy: ['harpreet', 'priya', 'vikram', 'tanvi'] },
      { by: 'tanvi', afterMinutes: 130, body: "I stopped adding to the regular plan and started new SIPs in the direct one. Left the old units alone for now. Not perfect, but it avoids the tax hit.", likedBy: ['harpreet', 'arjun'] },
      { by: 'imran', afterMinutes: 210, body: "It's fine for people who want help though. If someone can't pick funds on their own and a good distributor keeps them invested, that fee isn't wasted.", likedBy: ['tanvi', 'lakshmi'], dislikedBy: ['faisal'] },
    ],
  },
  {
    by: 'arjun',
    space: 'investing',
    daysAgo: 11,
    title: 'How did you pick your split between equity, debt and gold?',
    body: "I'm 28 with a steady job and no dependants yet. Right now it's roughly 70% equity funds, 20% PPF and FD, and 10% gold. I picked it more by feel than by any method. How do you decide your own split, and do you ever rebalance?",
    likedBy: ['priya', 'meera', 'lakshmi', 'rahul', 'vikram', 'harpreet', 'kavya'],
    comments: [
      { by: 'priya', afterMinutes: 45, body: "I wrote down when I'd need the money. Anything needed in under three years isn't in equity. That one rule made the rest easier.", likedBy: ['arjun', 'meera', 'rohan', 'ananya'] },
      { by: 'lakshmi', afterMinutes: 160, body: "I rebalance once a year, on my birthday, and only if something has drifted by more than 5 percentage points. Otherwise I leave it alone.", likedBy: ['arjun', 'priya', 'sneha'] },
      { by: 'rahul', afterMinutes: 340, body: "The asset allocation article in Learn has a simple way to think about it. Also remember that your split should change as your life does.", likedBy: ['arjun'] },
    ],
  },
  {
    by: 'priya',
    space: 'stocks',
    daysAgo: 13,
    title: 'How do you read a P/E ratio without getting misled?',
    body: "Every stock page shows a P/E. A low number looks cheap and a high number looks expensive, but I've also read that this is too simple. How do you actually use it? Do you compare with the sector, with the stock's own history, or something else?",
    likedBy: ['imran', 'faisal', 'arjun', 'nikhil', 'tanvi', 'vikram'],
    comments: [
      { by: 'imran', afterMinutes: 30, body: "Never alone. A bank and an IT company have very different normal ranges, so I only compare within the same sector. Then I look at how the company's own P/E has moved over the years.", likedBy: ['priya', 'arjun', 'nikhil', 'faisal'] },
      { by: 'faisal', afterMinutes: 110, body: "Also check whether profits are growing or just had a one-off good quarter. A low P/E on shrinking profits isn't cheap, it's a warning.", likedBy: ['priya', 'imran', 'kavya'] },
      { by: 'tanvi', afterMinutes: 280, body: "The article on reading a stock page covers this. Short version: it's one number in a pile of numbers.", likedBy: ['priya'] },
    ],
  },
  {
    by: 'imran',
    space: 'stocks',
    daysAgo: 15,
    title: 'Anyone else anxious on red days? What do you do?',
    body: "The index was down a couple of percent this week and I opened my portfolio six times before lunch. I know it isn't helping. What do you do to stop checking?",
    likedBy: ['kavya', 'harpreet', 'meera', 'divya', 'ananya', 'rahul', 'lakshmi'],
    comments: [
      { by: 'kavya', afterMinutes: 50, body: "I deleted the broker app from my home screen. I check it on the first Sunday of every month and that's it. My sleep got better.", likedBy: ['imran', 'ananya', 'meera', 'lakshmi', 'rohan'] },
      { by: 'harpreet', afterMinutes: 120, body: "I wrote a note on why I invested in each thing and when I'd actually need the money. On red days I read the note instead of the chart.", likedBy: ['imran', 'kavya', 'arjun', 'sneha'] },
      { by: 'meera', afterMinutes: 330, body: "If a 5% fall ruins your week, the equity share might simply be higher than you can handle. No shame in that, it's just worth knowing.", likedBy: ['imran', 'harpreet'], dislikedBy: ['rahul'] },
    ],
  },
  {
    by: 'sneha',
    space: 'tax',
    daysAgo: 18,
    title: 'Old or new tax regime: how do you decide each year?',
    body: "I used to stick with whatever HR had selected for me. This year I want to actually work it out. For those of you who compare the two, what do you put in? I have HRA, an ELSS SIP and a health insurance premium, if that matters.",
    likedBy: ['faisal', 'nikhil', 'tanvi', 'harpreet', 'priya', 'vikram', 'divya', 'kavya'],
    comments: [
      { by: 'faisal', afterMinutes: 60, body: "Do the full calculation with your real numbers, both ways, using the income tax department's own calculator. The answer changes with your deductions, so last year's answer may not hold this year.", likedBy: ['sneha', 'nikhil', 'harpreet', 'priya'] },
      { by: 'nikhil', afterMinutes: 190, body: "Keep in mind that the choice you tell your employer is only for the TDS. You can still pick differently when you file the return.", likedBy: ['sneha', 'faisal', 'tanvi'] },
      { by: 'tanvi', afterMinutes: 420, body: "The tax records and regimes article in Learn lists what to compare. Please check the current slabs on the official site before you decide, they do change.", likedBy: ['sneha', 'faisal'] },
    ],
  },
  {
    by: 'faisal',
    space: 'tax',
    daysAgo: 21,
    title: 'Which documents do you keep for your ITR, and for how long?',
    body: "I used to throw things away after filing. Then I got a notice asking for proof of a deduction from an earlier year and spent a weekend searching my email. Now I'm trying to set up a proper folder. What do you keep, and where?",
    likedBy: ['lakshmi', 'divya', 'sneha', 'harpreet', 'rahul', 'priya'],
    comments: [
      { by: 'lakshmi', afterMinutes: 70, body: "One folder per financial year on cloud storage: Form 16, interest certificates, rent receipts, premium receipts, fund statements, and a PDF of the filed return with its acknowledgement.", likedBy: ['faisal', 'sneha', 'tanvi', 'nikhil'] },
      { by: 'divya', afterMinutes: 210, body: "I keep everything for at least six years. Better to keep it longer than to wonder.", likedBy: ['faisal'] },
      { by: 'sneha', afterMinutes: 380, body: "I add a note at the top of each folder with what I claimed and why. Future me always has questions.", likedBy: ['faisal', 'lakshmi', 'divya'] },
    ],
  },
  {
    by: 'tanvi',
    space: 'protection',
    daysAgo: 24,
    title: 'How did you decide your term insurance cover?',
    body: "I'm 31 with a home loan and a parent who depends on me. The online calculators give wildly different answers. How did you pick the amount, and what mattered most to you when comparing insurers?",
    likedBy: ['rahul', 'divya', 'harpreet', 'arjun', 'meera', 'lakshmi', 'sneha'],
    comments: [
      { by: 'rahul', afterMinutes: 55, body: "I took my loan outstanding plus about ten times my yearly expenses and compared that with the calculators, then rounded up. It's more art than science, honestly.", likedBy: ['tanvi', 'arjun', 'rohan', 'divya'] },
      { by: 'divya', afterMinutes: 140, body: "Please disclose everything honestly on the form, including smoking and any health condition. Claims get rejected for non-disclosure more than for almost anything else.", likedBy: ['tanvi', 'rahul', 'lakshmi', 'meera', 'sneha', 'harpreet'] },
      { by: 'harpreet', afterMinutes: 290, body: "I looked at the claim settlement ratio, but I also read how long the insurer takes to settle. Both are in the insurer's public disclosures.", likedBy: ['tanvi', 'rahul', 'divya'] },
      { by: 'arjun', afterMinutes: 450, body: "The term and health insurance article here is a good start before you compare quotes.", likedBy: ['tanvi'] },
    ],
  },
  {
    by: 'rahul',
    space: 'protection',
    daysAgo: 27,
    title: 'Employer health cover, or a personal policy as well?',
    body: "My company gives a group health policy. A colleague says I should buy my own as well, because the group cover ends if I leave. Is it worth paying premiums for something I might not use for years?",
    likedBy: ['tanvi', 'lakshmi', 'vikram', 'ananya', 'nikhil', 'kavya'],
    comments: [
      { by: 'tanvi', afterMinutes: 45, body: "I bought a small personal base policy at 29 while I was healthy. Premiums stay lower when you start young and the waiting periods are already served by the time you need it.", likedBy: ['rahul', 'divya', 'ananya'] },
      { by: 'lakshmi', afterMinutes: 170, body: "Yes. The group cover disappears exactly when you're between jobs, which is also when you least want a medical bill.", likedBy: ['rahul', 'tanvi', 'meera', 'vikram'] },
      { by: 'vikram', afterMinutes: 360, body: "A personal policy also means the waiting periods for existing conditions start counting from now. That alone convinced me.", likedBy: ['rahul', 'lakshmi'] },
    ],
  },
  {
    by: 'lakshmi',
    space: 'credit',
    daysAgo: 30,
    title: 'Total due or minimum due on the credit card?',
    body: "I know the advice is to always pay the full amount, but this month I had a big expense and paying everything leaves my account very thin. What actually happens if I pay only the minimum, and is there a better middle path?",
    likedBy: ['nikhil', 'priya', 'sneha', 'ananya', 'faisal', 'rohan', 'imran'],
    comments: [
      { by: 'nikhil', afterMinutes: 35, body: "Once you don't pay in full, interest is charged from the purchase date on the whole amount, not only on what's left. It costs a lot more than it looks on the statement.", likedBy: ['lakshmi', 'priya', 'ananya', 'faisal'] },
      { by: 'priya', afterMinutes: 120, body: "If you can't pay in full, pay as much as you can above the minimum. If it keeps happening, look at converting the big purchase to an EMI before the due date, and compare the interest first.", likedBy: ['lakshmi', 'nikhil'] },
      { by: 'sneha', afterMinutes: 260, body: "Autopay for the total due so I never miss the date, plus a reminder three days before to check the balance.", likedBy: ['lakshmi', 'nikhil', 'ananya'] },
    ],
  },
  {
    by: 'divya',
    space: 'safety',
    daysAgo: 33,
    title: "Got a call from 'my bank's fraud team'. What would you do?",
    body: "Someone called saying a transaction of ₹48,000 was being made on my card and I should verify it with an OTP to block it. I hung up, but I'm still a bit shaken. What's the best thing to do after something like this, and how do I get my parents to watch out too?",
    likedBy: ['imran', 'kavya', 'faisal', 'sneha', 'rahul', 'harpreet', 'tanvi', 'lakshmi', 'meera'],
    comments: [
      { by: 'imran', afterMinutes: 20, body: "You did exactly the right thing. A bank never asks for an OTP, PIN or CVV on a call. If you want to check, call the number printed on the back of your card, never a number the caller gives you.", likedBy: ['divya', 'kavya', 'rahul', 'harpreet', 'faisal', 'sneha'] },
      { by: 'kavya', afterMinutes: 75, body: "You can report it on 1930, the national cyber crime helpline, even if you lost no money. If money was taken, call right away, the first hour matters most.", likedBy: ['divya', 'imran', 'tanvi', 'meera'] },
      { by: 'faisal', afterMinutes: 200, body: "For my parents I printed a card saying 'Nobody real will ever ask for your OTP' and stuck it on their fridge. It sounds silly but they actually read it.", likedBy: ['divya', 'imran', 'kavya', 'lakshmi', 'ananya'] },
    ],
  },
  {
    by: 'kavya',
    space: 'safety',
    daysAgo: 36,
    title: "A WhatsApp group promises 'guaranteed' monthly returns",
    body: "I was added to a group where members post screenshots of daily profits and an 'analyst' says returns are guaranteed if you deposit through their app. A cousin has already put in ₹20,000. How do I explain to him that this looks wrong?",
    likedBy: ['vikram', 'harpreet', 'ananya', 'imran', 'divya', 'meera', 'priya', 'rahul'],
    comments: [
      { by: 'vikram', afterMinutes: 30, body: "Guaranteed returns on market investments are the biggest red flag there is. Nobody legitimate can promise that. Ask him whether he can withdraw first, since many of these let you take out a small amount to build trust.", likedBy: ['kavya', 'imran', 'divya', 'arjun'] },
      { by: 'harpreet', afterMinutes: 90, body: "Check whether the person or firm is registered with SEBI. The register is on SEBI's own website and takes a minute to search. If they aren't on it, that settles it.", likedBy: ['kavya', 'vikram', 'divya', 'faisal'] },
      { by: 'ananya', afterMinutes: 240, body: "Please don't blame him when you talk. People get embarrassed and stay quiet while they lose more. Stay calm and just ask him to stop adding money.", likedBy: ['kavya', 'vikram', 'imran'] },
    ],
  },
  {
    by: 'meera',
    space: 'general',
    daysAgo: 40,
    title: 'One money habit that actually stuck for you?',
    body: "I'll start. I move 10% of my salary to a separate account on the day it arrives, before I see it. Three years in and I don't miss it. What small habit has worked for you?",
    likedBy: ['rohan', 'lakshmi', 'vikram', 'imran', 'ananya', 'divya', 'tanvi', 'harpreet', 'kavya', 'nikhil'],
    comments: [
      { by: 'rohan', afterMinutes: 40, body: "A 24 hour rule for anything above ₹3,000 that wasn't planned. Most things I wanted on day one, I didn't want on day two.", likedBy: ['meera', 'ananya', 'arjun', 'nikhil', 'kavya'] },
      { by: 'lakshmi', afterMinutes: 130, body: "A Sunday evening review of the week's spending. Ten minutes, a cup of tea, no judgement.", likedBy: ['meera', 'rohan'] },
      { by: 'vikram', afterMinutes: 250, body: "An auto-SIP on the 2nd. Because I never see the money, I never have to decide whether to invest it.", likedBy: ['meera', 'harpreet', 'imran'] },
      { by: 'imran', afterMinutes: 420, body: "Tracking everything in one app. Seeing the month as a whole changed what I buy.", likedBy: ['meera'] },
    ],
  },
  {
    by: 'nikhil',
    space: 'general',
    daysAgo: 44,
    title: 'Budgets: one limit per category, or a single monthly number?',
    body: "I started with category limits and gave up in the second month because I was always shifting money between them. A friend uses one overall number. Which has worked better for you, and how strict are you with yourself?",
    likedBy: ['ananya', 'faisal', 'sneha', 'priya', 'divya', 'harpreet'],
    dislikedBy: ['rahul'],
    comments: [
      { by: 'ananya', afterMinutes: 60, body: "Per category for the three that matter to me: food, shopping and travel. Everything else sits under one 'misc' limit.", likedBy: ['nikhil', 'divya', 'priya'] },
      { by: 'faisal', afterMinutes: 180, body: "One number. Too many limits and I spend more time managing the budget than the money.", likedBy: ['nikhil', 'sneha'], dislikedBy: ['priya'] },
    ],
  },
];

/** Comments on the articles in Learn. */
export const ARTICLE_COMMENTS = [
  { article: 'emergency-fund', by: 'meera', daysAgo: 12, body: "I read this and opened a separate account the same evening. Seeing it as 'not my money' helped.", likedBy: ['rohan', 'kavya', 'ananya'] },
  { article: 'emergency-fund', by: 'imran', daysAgo: 9, body: "The part about topping it up again after you use it is easy to skip. Worth repeating.", likedBy: ['meera', 'tanvi'] },
  { article: 'compounding-and-sip', by: 'vikram', daysAgo: 14, body: "The comparison of what starting five years later costs you is the one I screenshotted for my brother.", likedBy: ['harpreet', 'nikhil', 'sneha', 'priya'] },
  { article: 'compounding-and-sip', by: 'lakshmi', daysAgo: 6, body: "Good explanation. It might help to add that returns aren't a straight line. Mine were flat for two years before anything moved.", likedBy: ['vikram', 'priya'] },
  { article: 'budget-50-30-20', by: 'sneha', daysAgo: 16, body: "In a city with high rent the 50% for needs is hard to hit. I treat it as a direction, not a rule.", likedBy: ['nikhil', 'ananya', 'faisal', 'tanvi'] },
  { article: 'nifty-sensex-basics', by: 'rohan', daysAgo: 20, body: "Finally someone explains why both numbers move almost together without making it complicated.", likedBy: ['priya', 'imran'] },
  { article: 'nifty-sensex-basics', by: 'kavya', daysAgo: 17, body: "Useful. I always thought the Sensex was the bigger one just because its number is larger.", likedBy: ['rohan', 'divya', 'faisal'] },
  { article: 'term-and-health-insurance', by: 'tanvi', daysAgo: 22, body: "The list of what to disclose is the most important paragraph here.", likedBy: ['rahul', 'divya', 'harpreet', 'arjun'] },
  { article: 'term-and-health-insurance', by: 'rahul', daysAgo: 19, body: "I wish I had read this before buying at 30. Waiting periods don't get mentioned enough.", likedBy: ['tanvi', 'lakshmi'] },
  { article: 'credit-score-and-cards', by: 'nikhil', daysAgo: 25, body: "Utilisation was the missing piece for me. I paid on time but used 90% of my limit every month.", likedBy: ['lakshmi', 'priya', 'ananya', 'sneha'] },
  { article: 'investment-scams', by: 'kavya', daysAgo: 28, body: "Sharing this in my family group today. The 'guaranteed returns' part is exactly what my uncle keeps getting forwarded.", likedBy: ['divya', 'imran', 'vikram', 'harpreet', 'faisal'] },
  { article: 'investment-scams', by: 'harpreet', daysAgo: 26, body: "The SEBI register check is the easiest step and most people never do it.", likedBy: ['kavya', 'vikram', 'imran'] },
  { article: 'upi-safety', by: 'divya', daysAgo: 31, body: "Collect requests are what caught my mother. She thought she was receiving money.", likedBy: ['faisal', 'imran', 'kavya', 'lakshmi', 'meera'] },
  { article: 'upi-safety', by: 'faisal', daysAgo: 29, body: "A note about screen-sharing apps would help. That is how a lot of these calls end.", likedBy: ['divya', 'imran'] },
  { article: 'mutual-fund-basics', by: 'arjun', daysAgo: 23, body: "Clear. The NAV explanation cleared up the 'low NAV means cheap' idea I had.", likedBy: ['harpreet', 'vikram', 'sneha'] },
  { article: 'index-vs-active-funds', by: 'priya', daysAgo: 21, body: "Nice that it doesn't push one side. I hold both, and this made it easier to say why.", likedBy: ['arjun', 'harpreet', 'nikhil'] },
];

/** How much there is to seed. */
export function communityTotals() {
  return {
    members: COMMUNITY_MEMBERS.length,
    posts: COMMUNITY_POSTS.length,
    comments: COMMUNITY_POSTS.reduce((n, p) => n + p.comments.length, 0) + ARTICLE_COMMENTS.length,
  };
}

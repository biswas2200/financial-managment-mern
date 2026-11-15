/**
 * The text of the Privacy Policy and the Terms of Use, as data so the pages stay simple and the
 * wording lives in one place. When any of this changes in a way users must see again,
 * bump POLICY_VERSION in shared/src/profile.js.
 *
 * Each section is { id, title, body: [paragraph | { list: [..] } | { table: { head, rows } }] }.
 */

export const PRIVACY = {
  title: 'Privacy Policy',
  intro: [
    'Kosha is a student project: a personal finance tracker with an AI helper called Copilot. This policy says, in plain language, what Kosha collects about you, why, who can see it and what you can do about it.',
  ],
  note: 'This summary is not legal advice. It describes what the app actually does today.',
  sections: [
    {
      id: 'collect',
      title: 'What we collect',
      body: [
        'Only what you type in, plus what the app needs to keep you signed in.',
        {
          table: {
            head: ['What', 'Details', 'Required?'],
            rows: [
              ['Account', 'Your name, your email address, and a password. The password is stored only as a one-way hash, so nobody can read it.', 'Yes'],
              ['Phone number', 'Kept in international format, shown only to you in Settings.', 'No'],
              ['Date of birth', 'Used to check you are at least 13 and to show your age. Nothing else.', 'No'],
              ['Profile picture', 'An icon you pick, or a small photo you upload. Photos are shrunk in your browser before they are saved.', 'No'],
              ['Your money data', 'Transactions (amount, date, category, merchant, description, notes, payment method), budgets, categories and the starting balance you set.', 'Yes, to use the app'],
              ['Copilot messages', 'What you ask Copilot and the answers it gives, so the conversation is still there next time.', 'Only if you use Copilot'],
              ['Your agreement', 'Which version of these documents you accepted and when.', 'Yes'],
              ['Technical', 'One sign-in cookie (httpOnly, so scripts cannot read it) and a few preferences in your browser (theme, a hidden checklist). The server may log the time and address of requests while it runs.', 'Yes'],
            ],
          },
        },
        'Kosha does not connect to your bank. Any balance or transaction in the app was typed in by you, or comes from the clearly labelled demo bank, which uses made-up figures.',
      ],
    },
    {
      id: 'why',
      title: 'Why we use it',
      body: [
        {
          list: [
            'To run the app: sign you in, store your records and work out the totals, charts and budgets you see.',
            'To answer your questions in Copilot.',
            'To keep your account safe, for example by checking your current password before it can be changed.',
            'To check your age, if you gave your date of birth.',
            'To reach you about your account, if you gave a phone number. Kosha does not send marketing.',
          ],
        },
        'We do not sell your data, show ads, or build profiles for anyone else.',
      ],
    },
    {
      id: 'gemini',
      title: 'Copilot and Google Gemini',
      body: [
        'Copilot can run in two ways. Which one is active is shown in Settings.',
        {
          list: [
            'With Google Gemini: your message, the recent conversation, and the figures Copilot looks up to answer it (for example your spending by category) are sent to Google to write the reply. Google handles that data under its own terms for the Gemini service.',
            'Offline: a built-in rule engine answers on the server and nothing is sent to Google.',
          ],
        },
        'Copilot only reads your data to answer. It cannot add or change anything unless you confirm a draft it shows you.',
      ],
    },
    {
      id: 'who',
      title: 'Who can see it',
      body: [
        'Your records are stored in the Kosha database run by whoever hosts this copy of the app. Other Kosha users cannot see them. Beyond that host, the only other party is Google, when Copilot uses Gemini as described above.',
        'We share your data with no one else unless the law requires it.',
      ],
    },
    {
      id: 'keep',
      title: 'How long we keep it',
      body: [
        'For as long as you have an account. You can edit or delete any transaction, budget or category yourself, clear your Copilot conversation, and remove your phone number, date of birth or picture at any time.',
        'Deleting your account from Settings permanently removes your profile, transactions, budgets, categories and Copilot messages.',
      ],
    },
    {
      id: 'rights',
      title: 'Your choices and rights',
      body: [
        {
          list: [
            'See and correct your details: Settings, Profile.',
            'Take a copy of your transactions: Export CSV on the Transactions page.',
            'Withdraw your consent: delete your account in Settings. Optional details can be removed on their own.',
            'Ask a question or raise a concern: use the contact in the project README.',
          ],
        },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      body: [
        'Passwords are hashed with bcrypt. The sign-in cookie is httpOnly and SameSite, requests are validated on the server, and sign-in attempts are rate limited. No system is perfectly secure, so use a password you do not use anywhere else, and keep the app behind HTTPS if you host it yourself.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      body: ['Kosha is for people aged 13 and over. If you give a date of birth that makes you younger, the account is not created.'],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: ['When this policy changes in a way that matters, the version number below changes and you will be asked to accept the new version.'],
    },
  ],
};

export const TERMS = {
  title: 'Terms of Use',
  intro: ['These are the rules for using Kosha. By creating an account you agree to them and to the Privacy Policy.'],
  note: 'Kosha is a learning project. It comes without a promise that it will always be available or free of mistakes.',
  sections: [
    {
      id: 'account',
      title: 'Your account',
      body: [
        'You are responsible for what happens under your account and for keeping your password to yourself. Give accurate details, and tell us if you think someone else has got into your account. You must be at least 13.',
      ],
    },
    {
      id: 'use',
      title: 'Using Kosha',
      body: [
        {
          list: [
            'Use it for your own personal finances.',
            'Do not try to break it, overload it, or read other people\'s data.',
            'Do not put anything unlawful in your notes or Copilot messages.',
          ],
        },
      ],
    },
    {
      id: 'advice',
      title: 'Copilot and your decisions',
      body: [
        'Copilot is an AI helper. It can be wrong, and what it says is not financial advice. Kosha does not recommend investments or tell you what to buy or sell. Check important figures against your own records before you act on them.',
      ],
    },
    {
      id: 'data',
      title: 'Your data',
      body: ['Your records stay yours. You give Kosha permission to store and process them to run the app, as the Privacy Policy describes. You can export your transactions and delete your account whenever you like.'],
    },
    {
      id: 'availability',
      title: 'Availability and changes',
      body: ['The app is provided as it is. Features may change or stop working, and we may update these terms. When they change in a way that matters, you will be asked to accept the new version.'],
    },
    {
      id: 'ending',
      title: 'Ending your account',
      body: ['You can delete your account from Settings at any time. We may suspend an account that breaks these terms or puts others at risk.'],
    },
  ],
};

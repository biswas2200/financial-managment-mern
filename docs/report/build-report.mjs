/**
 * Builds docs/report/Kosha_Project_Report.docx.
 *
 *   python3 docs/report/prepare_images.py
 *   node docs/report/build-report.mjs [--engine=gemini|offline]
 *
 * The .docx is uploaded to Google Drive, which converts it into a Google Doc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const TMP = path.join(HERE, '.tmp');
const manifest = JSON.parse(fs.readFileSync(path.join(TMP, 'manifest.json'), 'utf8'));
const ENGINE = (process.argv.find((a) => a.startsWith('--engine=')) ?? '--engine=offline').split('=')[1];

// ---------- facts gathered from the repository ----------
const ev = (f) => fs.readFileSync(path.join(HERE, 'evidence', f), 'utf8');
const count = (text, re) => Number(re.exec(text)?.[1] ?? 0);
const T = {
  shared: count(ev('shared-tests.txt'), /Tests\s+(\d+) passed/),
  server: count(ev('server-tests.txt'), /Tests\s+(\d+) passed/),
  client: count(ev('client-tests.txt'), /Tests\s+(\d+) passed/),
  e2e: count(ev('e2e-tests.txt'), /(\d+) passed/),
};
const cov = {
  statements: /Statements\s+:\s+([\d.]+)%/.exec(ev('server-tests.txt'))?.[1],
  branches: /Branches\s+:\s+([\d.]+)%/.exec(ev('server-tests.txt'))?.[1],
  functions: /Functions\s+:\s+([\d.]+)%/.exec(ev('server-tests.txt'))?.[1],
};
const sumTests = (text, re) => [...text.matchAll(re)].reduce((n, m) => n + Number(m[1]), 0);
T.serverUnit = sumTests(ev('server-tests.txt'), /tests\/unit\/\S+ \((\d+) tests\)/g);
T.serverIntegration = sumTests(ev('server-tests.txt'), /tests\/integration\/\S+ \((\d+) tests\)/g);
const TOTAL_TESTS = T.shared + T.server + T.client + T.e2e;
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT }).toString().trim();
const COMMITS = Number(git('rev-list --count HEAD'));
const RED = Number(execSync('git log --oneline | grep -c "(red)" || true', { cwd: ROOT, shell: '/bin/bash' }).toString().trim());
const REPO = 'https://github.com/biswas2200/financial-managment-mern';

// ---------- styling helpers ----------
const FONT = 'Arial';
const BRAND = '2C3A8F';
const INK = '151B33';
const MUTED = '4B5371';
const LINE = 'C9CFDC';
const HEAD_FILL = 'E7EAF8';
const PAGE_W = 9026; // A4 width minus 1" margins, in DXA

const run = (text, o = {}) => new TextRun({ text, font: FONT, ...o });

/** Inline markup: **bold**, `code` */
function runs(text, base = {}) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**')) return run(part.slice(2, -2), { ...base, bold: true });
      if (part.startsWith('`')) return run(part.slice(1, -1), { ...base, font: 'Courier New', size: 19, color: '24307A' });
      return run(part, base);
    });
}

const P = (text, o = {}) => new Paragraph({ children: runs(text, o.run), spacing: { after: 140, line: 300 }, ...o.para });
const Note = (text) => P(text, { run: { color: MUTED, size: 20 }, para: { spacing: { after: 120, line: 280 } } });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run(text)] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(text)] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(text)] });

let listInstance = 0;
const bullets = (items) =>
  items.map((i) => new Paragraph({ children: runs(i), numbering: { reference: 'bullets', level: 0 }, spacing: { after: 70, line: 290 } }));
const numbered = (items) => {
  listInstance += 1;
  const instance = listInstance;
  return items.map(
    (i) => new Paragraph({ children: runs(i), numbering: { reference: 'numbers', level: 0, instance }, spacing: { after: 70, line: 290 } }),
  );
};

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const BORDERS = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };

function cell(content, width, { header = false, fill, bold = false, align, size = 19 } = {}) {
  const paragraphs = (Array.isArray(content) ? content : [content]).map(
    (c) =>
      new Paragraph({
        alignment: align,
        spacing: { after: 40, line: 264 },
        children: runs(c, { bold: header || bold, size, color: header ? INK : undefined }),
      }),
  );
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header || fill ? { type: ShadingType.CLEAR, color: 'auto', fill: header ? HEAD_FILL : fill } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: VerticalAlign.TOP,
    children: paragraphs,
  });
}

/** widths are relative weights; they are scaled to the page width. */
function table(headers, rows, weights, o = {}) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / sum) * PAGE_W));
  widths[widths.length - 1] += PAGE_W - widths.reduce((a, b) => a + b, 0);
  const trs = [];
  if (headers) trs.push(new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { header: true })) }));
  rows.forEach((r) =>
    trs.push(
      new TableRow({
        cantSplit: true,
        children: r.map((c, i) => cell(c, widths[i], { bold: o.boldFirst && i === 0, align: o.align?.[i], fill: o.fills?.[i] })),
      }),
    ),
  );
  return [
    new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: o.borders ?? BORDERS, rows: trs }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

let figureNo = 0;
function image(key, widthIn) {
  const m = manifest[key];
  if (!m) throw new Error(`Missing image ${key}`);
  const w = Math.round(widthIn * 96);
  return new ImageRun({ type: m.type, data: fs.readFileSync(path.join(TMP, m.file)), transformation: { width: w, height: Math.round((m.height / m.width) * w) } });
}
function figure(key, caption, widthIn = 6.27) {
  figureNo += 1;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true, children: [image(key, widthIn)] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [run(`Figure ${figureNo}: `, { bold: true, size: 19, color: MUTED }), ...runs(caption, { size: 19, color: MUTED })],
    }),
  ];
}
function figurePair(keyA, keyB, caption) {
  figureNo += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [image(keyA, 2.3), run('      '), image(keyB, 2.3)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [run(`Figure ${figureNo}: `, { bold: true, size: 19, color: MUTED }), ...runs(caption, { size: 19, color: MUTED })],
    }),
  ];
}

function code(lines) {
  return [
    ...lines.map(
      (l, i) =>
        new Paragraph({
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F5F9' },
          spacing: { before: i === 0 ? 80 : 0, after: 0, line: 252 },
          indent: { left: 120, right: 120 },
          children: [run(l || ' ', { font: 'Courier New', size: 17, color: INK })],
        }),
    ),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

const link = (text, url) => new ExternalHyperlink({ link: url, children: [run(text, { color: BRAND, underline: {} })] });
const blank = (label = '') => `${label}________________________`;

// ---------- 1. Cover page ----------
const cover = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [run('[Institution name]', { size: 26, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Master of Computer Applications, Semester 3', { size: 22, color: MUTED })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [run('Full-Stack Web Development Using MERN (25MCA301)', { size: 22, color: MUTED })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run('Kosha', { size: 96, bold: true, color: BRAND })] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [run('Personal finance tracker built on the MERN stack', { size: 30, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: 'D99A1E', space: 12 } },
    children: [run('with Kosha Copilot, an AI assistant powered by the Google Gemini API', { size: 22, color: MUTED, italics: true })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 200 }, children: [run('Full-Stack Project Report', { size: 28, bold: true, color: INK })] }),
  ...table(
    ['', 'Name', 'USN'],
    [
      ['Student 1', '[Name]', '[USN]'],
      ['Student 2', '[Name]', '[USN]'],
      ['Student 3', '[Name]', '[USN]'],
    ],
    [1.2, 3, 2],
    { boldFirst: true },
  ),
  ...table(
    null,
    [
      ['Section / Batch', '[Section / Batch]', 'Team / Group No.', '[Group No.]'],
      ['Faculty', 'Dr. Vidya Sagar S D', 'Date of submission', 'November 2026'],
    ],
    [1.6, 2.4, 1.7, 1.8],
    { fills: ['F3F5F9', undefined, 'F3F5F9', undefined] },
  ),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [run('Source code: ', { size: 20, color: MUTED }), link(REPO, REPO)] }),
];

// ---------- Contents ----------
const contents = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run('Contents')] }),
  ...table(
    ['No.', 'Section', 'What it covers'],
    [
      ['1', 'Cover page', 'Title, course, team and faculty'],
      ['2', 'Rubrics', 'Marks allocation, scoring guide and where each criterion is evidenced'],
      ['3', 'Contribution of work done', 'Role, work and share of each student (Annexure A)'],
      ['4', 'About the project', 'Abstract, problem statement, objectives, scope, modules, requirements'],
      ['5', 'Hardware and software requirements', 'Machines, runtimes and libraries with versions'],
      ['6', 'Methodology', 'Process, architecture, database, API, aggregation, frontend, Copilot, security, testing'],
      ['7', 'Results', 'Screenshots of every screen, database and test runs'],
      ['8', 'Conclusion', 'Outcomes against objectives, limitations, future scope'],
      ['9', 'GitHub proof', 'Repository and commit history'],
      ['10', 'References', 'Documentation and standards used'],
    ],
    [0.6, 3, 6],
    { boldFirst: true },
  ),
];

// ---------- 2. Rubrics ----------
const rubrics = [
  H1('2. Rubrics'),
  P('The project is marked out of 20 under the course rubric. The table reproduces the marks allocation, with a final column pointing to where each criterion is shown in this report and in the source code.'),
  ...table(
    ['No.', 'Assessment component', 'Evidence to evaluate', 'Max', 'Awarded', 'Where to find it'],
    [
      ['01', 'Problem definition & requirements', 'Clear problem statement, objectives, scope and planned modules.', '2', '', 'Sections 4.3 to 4.7'],
      ['02', 'Frontend design & usability', 'Functional interface, navigation, forms, responsiveness and validation.', '3', '', 'Sections 6.7, 7; client/src'],
      ['03', 'Backend APIs & business logic', 'Appropriate routes, working server-side functions, validation/error handling.', '3', '', 'Sections 6.5, 6.6; server/src'],
      ['04', 'Database design & operations', 'Suitable data model and correct persistent CRUD operations.', '2', '', 'Section 6.4'],
      ['05', 'End-to-end integration', 'Connected frontend, backend and database; core use cases work.', '3', '', 'Sections 6.2, 7; e2e/specs'],
      ['06', 'Testing & live demonstration', 'Test evidence, handling of common failures and stable demonstration.', '2', '', 'Sections 6.10 and 7.6'],
      ['07', 'Written project report', 'Completeness, technical accuracy, screenshots, test results and presentation.', '4', '', 'This document'],
      ['08', 'Viva & individual contribution', 'Explains implementation decisions and own contribution.', '1', '', 'Section 3'],
      ['', '**Total**', 'Final score (out of 20 marks)', '**20**', '', ''],
    ],
    [0.6, 2.1, 3.2, 0.75, 1.25, 1.9],
    { align: [AlignmentType.CENTER, undefined, undefined, AlignmentType.CENTER, AlignmentType.CENTER] },
  ),
  H2('Scoring guide'),
  ...table(
    ['Component', 'Scoring anchors (marks)'],
    [
      ['Problem definition (2)', ['2: Specific problem, measurable objectives and coherent requirements.', '1: Basic idea and partially defined objectives.', '0: Unclear or absent definition.']],
      ['Frontend (3)', ['3: Consistent, functional, responsive pages and validated inputs.', '2: Main screens functional; minor usability/validation gaps.', '1: Limited screens or major UI issues. 0: Not working/not built.']],
      ['Backend (3)', ['3: Core APIs/business rules work with input and error handling.', '2: Key APIs work; small functional or validation gaps.', '1: Partial API functionality. 0: No working backend.']],
      ['Database (2)', ['2: Appropriate schema/model and reliable create/read/update/delete.', '1: Partial persistence/CRUD or data-model issues.', '0: No usable database integration.']],
      ['Integration (3)', ['3: Main user journeys work end-to-end across all layers.', '2: Most important flows work; minor breakages.', '1: Only isolated/partial integration. 0: No integrated workflow.']],
      ['Testing & demo (2)', ['2: Relevant test cases/evidence and a successful live demo.', '1: Limited testing or partially working demonstration.', '0: No credible testing or demo.']],
      ['Project report (4)', ['4: Complete, technically accurate, well-structured report with diagrams, screenshots, results and references.', '3: Complete overall; minor gaps. 2: Important sections or evidence incomplete.', '1: Poorly organized, substantial omissions. 0: Not submitted/unusable.']],
      ['Viva & contribution (1)', ['1: Student can explain design, implementation and individual work.', '0: Cannot adequately demonstrate understanding/contribution.']],
    ],
    [2.2, 7],
    { boldFirst: true },
  ),
  H2('Required report contents and where they appear'),
  ...table(
    ['Rubric item (Annexure C)', 'Section in this report'],
    [
      ['Title page', '1. Cover page'],
      ['Abstract', '4.1'],
      ['Introduction and objectives', '4.2 to 4.4'],
      ['Requirements', '4.6, 4.7 and 5'],
      ['Architecture / flow diagram', '6.2 and 6.8'],
      ['Technology stack', '6.3'],
      ['Database design', '6.4'],
      ['API / module description', '4.5 and 6.5'],
      ['Implementation screenshots', '7'],
      ['Test cases and results', '6.10 and 7.6'],
      ['Conclusion / future scope', '8'],
      ['References', '10'],
    ],
    [4, 5],
  ),
];

// ---------- 3. Contribution ----------
function studentBlock(n, role, contribution, evidence, share) {
  return [
    H2(`Student ${String(n).padStart(2, '0')}`),
    ...table(
      null,
      [
        ['Name', '[Name]'],
        ['USN', '[USN]'],
        ['Assigned role', role],
        ['Actual contribution', contribution],
        ['Work evidence', evidence],
        ['Estimated work share', `${share}%`],
        ['Student signature', ''],
      ],
      [2, 7],
      { boldFirst: true, fills: ['F3F5F9', undefined] },
    ),
  ];
}
const contribution = [
  H1('3. Contribution of work done'),
  P('Kosha was built by a team of three. The record follows Annexure A of the rubric. Each member owned one layer of the system, and all work went into one shared GitHub repository.'),
  ...studentBlock(
    1,
    'Frontend and user experience',
    [
      'Designed the Kosha visual system (indigo ink, the banknote-style balance card, the Anek Latin typeface and a colour-blind-safe chart palette checked with a validator) and built every screen in React 18.',
      'Dashboard: balance card, KPI strip, 12-month cash flow, category ranking, daily heatmap, budgets and recent activity. Transactions page with URL-synced filters, day-grouped table, optimistic delete with undo and CSV export. Analytics, budgets, settings, sign-in and registration pages. Responsive layout with a mobile tab bar and a dark theme.',
    ],
    'client/src/features, client/src/components, client/src/styles/index.css; tests TransactionForm.test.jsx, KpiStrip.test.jsx, ActionCard.test.jsx, filters.test.js; report sections 6.7 and 7.',
    34,
  ),
  ...studentBlock(
    2,
    'Backend, database and Copilot agent',
    [
      'Designed the MongoDB data model (money as integer paise, compound indexes, unique constraints) and the Express 5 REST API: JWT cookie authentication, categories, transactions, budgets and analytics, with Zod validation and a central error handler.',
      'Wrote the aggregation pipelines ($facet, $lookup, $dateToString in Indian time) and the Copilot agent: nine tools over the user’s data, the Gemini function-calling provider, the offline rule engine and the confirm-before-save drafts. Wrote the server unit and integration tests.',
    ],
    `server/src/models, services, routes, agent; shared/src/money.js and schemas.js; server/tests (${T.server} tests); report sections 6.4 to 6.6 and 6.8.`,
    36,
  ),
  ...studentBlock(
    3,
    'Integration, testing, DevOps and report',
    [
      'Set up the npm workspace monorepo, Docker Compose (MongoDB 7 and mongo-express) and the seed pipeline: a deterministic data generator, a mongodump archive in the repository and automatic restore on a fresh volume.',
      `Connected the React app to the API (Vite proxy, TanStack Query hooks, cache invalidation), wrote the Playwright end-to-end suite (${T.e2e} journeys in Chrome) and the screenshot capture script, ran the test-first Git workflow on GitHub, and prepared the diagrams and this report.`,
    ],
    'docker-compose.yml, database/, server/scripts/seed.js, server/src/seed/generator.js, client/src/api/hooks.js, e2e/, docs/report/; report sections 5, 6.1, 6.10, 7 and 9.',
    30,
  ),
  H2('Group confirmation and faculty verification'),
  ...table(
    null,
    [
      ['Group declaration', 'The three students confirm that the entries above reflect their actual work. Combined shares total 100%.'],
      ['Total recorded contribution', '100% (Expected: 100%)'],
      ['Faculty verification', 'Individual contributions checked through code, demonstration, report and/or viva.'],
      ['Faculty', 'Dr. Vidya Sagar S D        Signature: ____________________        Date: ______________'],
    ],
    [2.4, 6.6],
    { boldFirst: true, fills: ['F3F5F9', undefined] },
  ),
];

// ---------- 4. About the project ----------
const about = [
  H1('4. About the project'),
  H2('4.1 Abstract'),
  P(
    `Kosha is a web application for recording daily income and expenses and seeing where the money goes. Users log transactions in rupees, group them into categories and set monthly budgets. The dashboard shows total income, total spending, the current balance and the savings rate, along with a 12-month cash-flow chart, a ranked breakdown by category and a daily spending heatmap. An assistant called Kosha Copilot answers questions such as "How much did I spend on dining last month?" by calling the Google Gemini API with function calling over the user's own data, and it can draft new transactions or budgets that are saved only after the user confirms them.`,
  ),
  P(
    `The system uses MongoDB, Express, React and Node.js. Money is stored as integer paise so that sums never drift, and every report is computed inside MongoDB with aggregation pipelines bucketed in Indian Standard Time. Development followed test-driven development: ${TOTAL_TESTS} automated tests cover shared logic, the REST API, React components and end-to-end user journeys, and server code coverage is ${cov.statements}% of statements.`,
  ),
  H2('4.2 Introduction'),
  P('Most people in India now pay through UPI, cards and cash, often many times a day and in small amounts. Each bank or wallet app shows its own slice of that activity, so it is hard to answer simple questions: how much came in this month, how much went out, and which categories took the most. Spreadsheets work for a while but need discipline, and they rarely give a clear picture over time.'),
  P('Kosha gives one place to log every transaction quickly and understand the month at a glance. It is a complete MERN application with authentication, validated forms, a REST API, a document database with aggregation-based reporting, interactive charts and an AI assistant, so it also demonstrates the full-stack skills the course covers.'),
  H2('4.3 Problem statement'),
  P('People who earn a monthly income and spend through several payment methods have no simple way to record daily transactions, see their running balance, and understand spending by category over time. Existing options either need manual spreadsheet work or cover only one bank account. The project builds a full-stack web application that records transactions accurately, turns them into summaries and charts, tracks budgets, and lets the user ask questions about their finances in plain language.'),
  H2('4.4 Objectives'),
  ...numbered([
    'Let users register and sign in, and keep each user’s data private: every database query is scoped to the signed-in user.',
    'Record income and expenses with amount, category, date, payment method, merchant and notes, with full create, read, update and delete, validated in the browser and on the server.',
    'Show total income, total expenses and the current balance on the dashboard, updated immediately after any change.',
    'Visualise spending habits: 12-month income against spending, category ranking, a daily heatmap, weekday patterns, category trends and top merchants.',
    'Support a monthly budget per category, with a heads-up at 75% of the limit and a warning when it is exceeded.',
    'Provide an AI assistant that answers questions from the user’s own data and drafts transactions and budgets that save only on confirmation.',
    'Keep money exact (integer paise) and dates consistent (Indian Standard Time) across the stack.',
    `Cover the server with automated tests to at least 80% of statements and test the main journeys end to end. Result: ${cov.statements}% statement coverage and ${T.e2e} passing end-to-end journeys.`,
  ]),
  H2('4.5 Scope and modules'),
  P('In scope: a single-user personal finance tracker in Indian rupees, running locally with MongoDB in Docker. Out of scope: bank or UPI account syncing, multi-currency conversion, shared household accounts, native mobile apps and production hosting.'),
  ...table(
    ['Module', 'What it does', 'Main code'],
    [
      ['Authentication', 'Register, sign in, sign out, profile name, password change. JWT in an httpOnly cookie.', 'server/src/routes/auth.routes.js, client/src/features/auth'],
      ['Categories', '17 default categories per user (12 expense, 5 income), custom categories, rename, delete only when unused.', 'server/src/services/category.service.js'],
      ['Transactions', 'Create, edit, delete, filter (type, category, method, dates, amount), search, paginate, export CSV.', 'server/src/services/transaction.service.js, client/src/features/transactions'],
      ['Budgets', 'Monthly limit per expense category with spent, remaining, percentage and status; copy from the previous month.', 'server/src/services/budget.service.js, client/src/features/budgets'],
      ['Analytics', 'Summary with comparison, category breakdown, monthly trend, daily totals, weekday totals, merchants, category trends.', 'server/src/services/analytics.service.js, client/src/features/analytics'],
      ['Kosha Copilot', 'Chat assistant using Gemini function calling over nine tools, confirmable drafts, offline fallback, dashboard insights.', 'server/src/agent, client/src/features/assistant'],
      ['Settings', 'Profile, password, theme (system, light, dark), category management, Copilot engine status.', 'client/src/features/settings'],
    ],
    [1.6, 4.6, 3],
    { boldFirst: true },
  ),
  H2('4.6 Functional requirements'),
  ...table(
    ['ID', 'Requirement'],
    [
      ['FR1', 'A visitor can create an account with name, email and password (at least 8 characters with a letter and a digit). Emails are unique.'],
      ['FR2', 'A user can sign in and out. Signed-out visitors are redirected to the sign-in page.'],
      ['FR3', 'A user can add, edit and delete a transaction. The category must belong to the user and match the transaction type.'],
      ['FR4', 'Amounts accept up to two decimal places and a maximum of ₹1,00,00,000 per transaction.'],
      ['FR5', 'The transaction list can be filtered, searched, sorted and paged, and the filters are kept in the URL.'],
      ['FR6', 'The dashboard shows income, expenses, balance and savings rate for the selected month, compared with the previous period.'],
      ['FR7', 'The dashboard and analytics pages show charts of spending by month, category, day and weekday, each with a table view.'],
      ['FR8', 'A user can set, edit, delete and copy monthly budgets and sees status warnings.'],
      ['FR9', 'A user can create, rename and delete custom categories; a category with transactions cannot be deleted.'],
      ['FR10', 'A user can export transactions to CSV with the current filters.'],
      ['FR11', 'Copilot answers questions about the user’s data and drafts transactions or budgets that are saved only after the user taps Confirm.'],
      ['FR12', 'If Gemini is not configured or fails, Copilot still answers using the offline engine.'],
    ],
    [0.8, 8],
    { boldFirst: true },
  ),
  H2('4.7 Non-functional requirements'),
  ...table(
    ['Quality', 'How Kosha meets it'],
    [
      ['Security', 'bcrypt password hashing, JWT in an httpOnly SameSite cookie, helmet headers, rate limits on sign-in and Copilot, Zod validation on every request, ownership checks on every query.'],
      ['Accuracy', 'Money stored and transmitted as integer paise; rupee strings parsed digit by digit; totals computed by MongoDB.'],
      ['Performance', 'Compound indexes on (user, date), (user, category, date) and (user, type, date). On the seed dataset every dashboard endpoint answered in under 20 ms locally (worst of three runs).'],
      ['Usability and accessibility', 'Keyboard-reachable controls with visible focus, labelled form fields with inline errors, a table view for every chart, chart colours checked for colour-blind separation, reduced-motion support, light and dark themes.'],
      ['Responsiveness', 'Layouts adapt from 360 px phones (bottom tab bar) to wide desktops (sidebar).'],
      ['Reliability', 'Copilot falls back to the offline engine on missing key, quota limits or network errors; drafts are confirmed atomically so a double click cannot save twice.'],
      ['Maintainability', 'Shared validation schemas used by browser and server, layered server code (routes, controllers, services, models), and an automated test suite.'],
      ['Portability', 'MongoDB runs in Docker with the seed data restored automatically; the app runs on Linux, Windows or macOS with Node.js 20 or later.'],
    ],
    [2, 7],
    { boldFirst: true },
  ),
];

// ---------- 5. Hardware & software ----------
const requirements = [
  H1('5. Hardware and software requirements'),
  H2('5.1 Hardware'),
  ...table(
    ['Component', 'Minimum', 'Machine used for development'],
    [
      ['Processor', '64-bit dual core, 2 GHz', 'Intel Core i5-12450HX (8 cores, 12 threads)'],
      ['Memory', '4 GB RAM (8 GB recommended)', '10 GB RAM'],
      ['Storage', '3 GB free (dependencies about 600 MB, MongoDB image about 800 MB)', 'SSD'],
      ['Display', '1280 x 720', '1440 x 900 and above'],
      ['Network', 'Needed for npm install, web fonts and the Gemini API', 'Broadband'],
      ['Client device', 'Any modern browser on desktop, or a phone at least 360 px wide', 'Google Chrome 157'],
    ],
    [1.6, 3.6, 3.4],
    { boldFirst: true },
  ),
  H2('5.2 Software'),
  ...table(
    ['Software', 'Version', 'Purpose'],
    [
      ['Operating system', 'Linux (kernel 7.0); also Windows 10+ or macOS 12+', 'Development and running'],
      ['Node.js / npm', '24.16 / 12.0 (Node 20+ supported)', 'JavaScript runtime and package manager (npm workspaces)'],
      ['Docker / Compose', '29.9 / 5.7', 'Runs MongoDB and mongo-express'],
      ['MongoDB', '7.0.45 (image mongo:7)', 'Document database'],
      ['mongo-express', '1.0.2', 'Database admin UI'],
      ['Express', '5.3.0', 'REST API framework'],
      ['Mongoose', '8.24.8', 'Object data modelling for MongoDB'],
      ['jsonwebtoken, bcryptjs', '9.0.3, 3.0.3', 'Session tokens and password hashing'],
      ['helmet, express-rate-limit, cors, cookie-parser', '8.3.0, 7.5.1, 2.8.5, 1.4.7', 'Security headers, rate limiting, CORS, cookies'],
      ['Zod', '3.25.76', 'Validation schemas shared by client and server'],
      ['@google/genai', '1.52.0', 'Google Gemini API client (function calling)'],
      ['React / React DOM', '18.3.1', 'User interface'],
      ['React Router', '6.30.6', 'Client-side routing'],
      ['TanStack Query', '5.107.1', 'Server-state caching and invalidation'],
      ['React Hook Form', '7.91.0', 'Form state'],
      ['Recharts', '3.10.1', 'Charts'],
      ['Tailwind CSS', '4.3.5', 'Styling with design tokens'],
      ['Vite', '6.4.6', 'Dev server and production build'],
      ['Vitest, Supertest, React Testing Library', '3.2.7, 7.3.2, 16.3.3', 'Unit, API integration and component tests'],
      ['Playwright', '1.65.0', 'End-to-end tests and screenshots in Chrome'],
      ['Git and GitHub', 'Current', 'Version control and hosting'],
      ['Gemini API key', 'Free tier, Google AI Studio', 'Enables Copilot’s Gemini engine (stored in server/.env, never committed)'],
    ],
    [3, 2.6, 3.6],
    { boldFirst: true },
  ),
];

// ---------- 6. Methodology ----------
const methodology = [
  H1('6. Methodology'),
  H2('6.1 Development process'),
  P(`The team worked in short iterations, each ending with something that ran: project scaffold and Docker database, shared money and validation logic, authentication, the transaction, category and budget APIs, analytics, the Copilot agent, the seed dataset, the React screens, end-to-end tests and finally this report.`),
  P(`Inside each iteration the team followed test-driven development. A failing test describing the next behaviour was written and committed first with a message ending in "(red)". The implementation was then written until the suite passed and committed as "(green)", followed by refactoring with the tests as a safety net. Every commit was pushed straight to the main branch on GitHub. At the time of writing the repository has ${COMMITS} commits, including ${RED} red and green pairs that show the test-first order.`),
  H2('6.2 System architecture'),
  P('Kosha is a three-tier web application. The React single-page app runs in the browser and talks to the Express REST API under /api/v1 using JSON. During development Vite serves the app and forwards /api requests to Express, so the browser sees a single origin and the httpOnly session cookie works without extra CORS setup. The API is stateless: each request carries a signed JWT in the cookie, and the requireAuth middleware loads the user before any route runs. Mongoose maps the models to MongoDB, which runs in Docker. When a Gemini API key is configured, the Copilot agent calls the Google Gemini API from the server; the key never reaches the browser.'),
  ...figure('diagram-architecture', 'System architecture.'),
  P('Figure 2 traces one request through every layer: adding an expense, from the form to the database and back to the refreshed dashboard.'),
  ...figure('diagram-request', 'Request lifecycle for adding an expense.'),
  H2('6.3 Technology stack'),
  ...table(
    ['Layer', 'Technology', 'Why it was chosen'],
    [
      ['Database', 'MongoDB 7 + Mongoose', 'Flexible documents for transactions and chat messages; the aggregation framework computes every report inside the database.'],
      ['API', 'Node.js + Express 5', 'Express 5 forwards errors from async handlers to the error middleware, so services can simply throw.'],
      ['Validation', 'Zod (shared package)', 'One schema validates the React form and the API request, so both reject exactly the same input.'],
      ['Frontend', 'React 18 + Vite', 'Component model and fast dev server with hot reload.'],
      ['Server state', 'TanStack Query', 'Caching, background refetch and invalidation after mutations keep every screen consistent.'],
      ['Charts', 'Recharts + custom SVG/HTML', 'Recharts for bars and lines; the heatmap and ranked bars are plain HTML for precise control.'],
      ['Styling', 'Tailwind CSS 4 with CSS variables', 'Design tokens defined once, with light and dark values.'],
      ['AI', 'Google Gemini API via @google/genai', 'Function calling lets the model request data through tools instead of seeing the database.'],
      ['Testing', 'Vitest, Supertest, RTL, Playwright', 'Fast unit tests, real HTTP integration tests against MongoDB, component tests and real-browser journeys.'],
      ['Infrastructure', 'Docker Compose', 'Reproducible database with seed data restored on first start.'],
    ],
    [1.4, 2.4, 5.4],
    { boldFirst: true },
  ),
  H2('6.4 Database design'),
  P('The database has five collections. Every document except User has a user field, and every query includes it, so one user can never read or change another user’s data. Figure 3 shows the model.'),
  ...figure('diagram-er', 'Entity relationship diagram of the kosha database.'),
  ...table(
    ['Collection', 'Purpose', 'Keys and indexes'],
    [
      ['users', 'Account: name, unique email, bcrypt hash (never returned by the API), currency.', 'unique email'],
      ['categories', 'Income and expense categories with icon and colour; 17 defaults per user plus custom ones.', 'unique (user, type, name), case-insensitive collation'],
      ['transactions', 'One income or expense: integer amount in paise, category, date, payment method, merchant, notes, tags, source (manual or copilot).', '(user, date), (user, category, date), (user, type, date)'],
      ['budgets', 'Monthly spending limit for one expense category, in paise.', 'unique (user, month, category)'],
      ['assistantmessages', 'Copilot conversation: role, content, engine used, tools called, chart payload and any draft awaiting confirmation.', '(user, createdAt)'],
    ],
    [1.6, 4.6, 3],
    { boldFirst: true },
  ),
  P('Three design decisions shape the data layer:'),
  ...bullets([
    '**Money as integer paise.** ₹450.50 is stored as 45050. Floating point cannot represent values like 0.1 exactly, so sums of many rupee amounts can drift. The shared `toMinor` function parses the typed string digit by digit and rejects more than two decimals, so no float arithmetic happens before storage.',
    '**Indian Standard Time for every bucket.** A payment at 11:30 pm on 31 October belongs to October. Aggregations pass `timezone: "Asia/Kolkata"` to `$dateToString` and `$dayOfWeek`, and date-only inputs are stored at noon IST so they never cross midnight.',
    '**Seed dataset in the repository.** A deterministic generator creates about a year of realistic activity for a demo account (748 transactions and 36 budgets) plus a second account. `npm run db:dump` writes a mongodump archive to database/dump, and a Docker init script restores it whenever the database volume is empty.',
  ]),
  H2('6.5 API design'),
  P('All endpoints are under /api/v1 and return JSON. Everything except /auth requires a valid session. Request bodies, query strings and route parameters are validated with Zod before the controller runs.'),
  ...table(
    ['Method', 'Endpoint', 'Purpose'],
    [
      ['POST', '/auth/register, /auth/login, /auth/logout', 'Create account, sign in (sets cookie), sign out'],
      ['GET, PATCH', '/auth/me', 'Current user; update display name'],
      ['POST', '/auth/change-password', 'Change password after checking the current one'],
      ['GET, POST', '/categories', 'List (optionally with usage counts) and create categories'],
      ['PATCH, DELETE', '/categories/:id', 'Rename or delete (409 if the category has transactions)'],
      ['GET, POST', '/transactions', 'List with filters, search, sort, paging and totals; create'],
      ['GET, PATCH, DELETE', '/transactions/:id', 'Read, update or delete one transaction'],
      ['GET', '/transactions/export.csv', 'Download filtered transactions as CSV'],
      ['GET, PUT', '/budgets', 'Budgets for a month with spent and status; create or update one'],
      ['POST, DELETE', '/budgets/copy, /budgets/:id', 'Copy a month’s budgets; delete a budget'],
      ['GET', '/analytics/summary', 'Income, expense, net, savings rate, change vs previous period, balance'],
      ['GET', '/analytics/by-category, /trend, /daily', 'Category breakdown, monthly trend, daily totals'],
      ['GET', '/analytics/weekday, /merchants, /category-trend', 'Weekday totals, top merchants, top categories by month'],
      ['GET', '/assistant/status, /assistant/insights', 'Active Copilot engine; dashboard insight cards'],
      ['GET, DELETE', '/assistant/history', 'Read or clear the conversation'],
      ['POST', '/assistant/message', 'Send a message to Copilot'],
      ['POST', '/assistant/actions/:id/confirm, /cancel', 'Save or discard a Copilot draft'],
      ['GET', '/api/health', 'API and database status'],
    ],
    [1.5, 3.6, 4.2],
  ),
  P('Errors use one format, produced by a central error handler that also translates Mongoose validation errors, invalid ids and duplicate keys:'),
  ...code([
    'HTTP/1.1 400 Bad Request',
    '{ "error": { "code": "VALIDATION_ERROR",',
    '             "message": "Please check the highlighted fields",',
    '             "details": [ { "path": "amount", "message": "Amount must be whole paise" } ] } }',
  ]),
  P('Status codes follow their usual meaning: 201 for creation, 204 for deletion, 400 for invalid input, 401 when signed out or the token is invalid, 404 for anything that does not exist or belongs to someone else, 409 for conflicts such as a duplicate email or deleting a category in use, and 429 when a rate limit is hit.'),
  H2('6.6 Business logic and aggregation pipelines'),
  P('Every number on the dashboard comes from MongoDB aggregation, not from loading documents into Node.js. The monthly summary uses a single `$facet` stage to compute the current period, the previous period and the all-time balance in one round trip:'),
  ...code([
    'Transaction.aggregate([',
    '  { $match: { user: userId } },',
    '  { $facet: {',
    '      current:  [ { $match: { date: { $gte: start, $lt: end } } },',
    "                  { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } } ],",
    '      previous: [ { $match: { date: { $gte: prevStart, $lt: prevEnd } } }, /* same $group */ ],',
    "      allTime:  [ { $group: { _id: '$type', total: { $sum: '$amount' } } } ]",
    '  } }',
    '])',
  ]),
  ...bullets([
    '**Month-to-date comparison.** While a month is in progress, the summary compares it with the same elapsed time of the previous month (1 to 10 November against 1 to 10 October), so the percentage change is fair.',
    '**Budgets with actual spending.** One pipeline starts from the budgets of a month, uses `$lookup` with a sub-pipeline to sum that month’s expenses in each category, and a second `$lookup` to attach the category name. Status is "warning" from 75% and "over" above 100%.',
    '**Trends.** Monthly and daily series group by `$dateToString` in IST and are zero-filled so charts have no gaps. Weekday totals use `$dayOfWeek`.',
    '**Unusual spending.** A category is flagged when this month has already passed its three-month average by 25%, or after 40% of the month is running at 1.5 times the expected pace, with a minimum gap of ₹1,000 to avoid noise.',
    '**Rules on write.** A transaction’s category must belong to the user and match its type; a budget can only target an expense category; a category with transactions cannot be deleted; CSV export escapes cells that start with =, +, - or @ to prevent formula injection in spreadsheets.',
  ]),
  H2('6.7 Frontend design and state management'),
  P('The interface takes its cues from Indian banknotes rather than a generic dashboard template. The balance sits on a celadon card with fine guilloche linework, drawn by a small generator that produces the wave and rosette paths, and a marigold "security thread". Text uses Anek Latin by the Mumbai foundry Ek Type, set wide for headings and condensed for large rupee figures. Indigo is the ink and brand colour. Charts use one validated pair of colours for income and spending; category comparisons use ranked single-colour bars and small multiples instead of multicolour pies, and every chart panel can switch to a table.'),
  ...bullets([
    '**Server state.** TanStack Query caches every API response. After a transaction is added, edited or deleted, the related queries (transactions, analytics, budgets, insights) are invalidated and refetched, so all screens agree without manual refreshes.',
    '**Complex local state.** The transactions page keeps its filters in a `useReducer` reducer that is synchronised with the URL, so a filtered view can be bookmarked. Changing the type clears an incompatible category, and every filter change returns to page 1.',
    '**Optimistic updates.** Deleting a transaction removes the row immediately and restores it if the API refuses. The toast offers Undo, which re-creates the transaction.',
    '**Validation.** Forms use React Hook Form with the shared Zod schemas, so the user sees the same message the server would return. Server-side field errors are also mapped back onto the matching input.',
    '**Accessibility.** Labelled inputs, error text linked with aria-describedby, native dialogs that trap focus, a skip link, visible focus rings, a keyboard-operable heatmap, and animation disabled for users who prefer reduced motion.',
  ]),
  H2('6.8 Kosha Copilot: the AI agent'),
  P(`Copilot is built around tools. The server defines nine functions over the user’s data, each with a JSON schema. When the Gemini engine is active, the user’s message, a system instruction and the tool declarations are sent to the Gemini API with \`generateContent\`. Gemini decides which tools it needs and returns function calls; Kosha runs them against MongoDB and sends the results back as function responses, repeating for up to five rounds until Gemini replies in text. The model never queries the database directly and only sees the figures the tools return.`),
  ...figure('diagram-agent', 'Copilot request flow with Gemini function calling and the offline fallback.'),
  ...table(
    ['Tool', 'What it returns'],
    [
      ['get_summary', 'Income, expenses, savings, savings rate and change for a month or date range, plus balance'],
      ['get_spending_by_category', 'Category breakdown with shares'],
      ['compare_months', 'Two months side by side and the categories that changed most'],
      ['get_budget_status', 'Budgets with spent, remaining and status'],
      ['find_transactions', 'Transactions matching text, category, type or dates'],
      ['get_monthly_trend', 'Income and spending for the last N months'],
      ['detect_unusual_spending', 'Categories running well above their usual level'],
      ['propose_transaction', 'A validated draft of a new income or expense (not saved)'],
      ['propose_budget', 'A validated draft of a monthly budget (not saved)'],
    ],
    [2.6, 6.4],
    { boldFirst: true },
  ),
  P('Writes always need the user. The two "propose" tools validate the draft with the same Zod schema as the API and store it on the assistant message as a pending action. The chat shows it as a card with Confirm and Discard. Confirming calls a separate endpoint that atomically changes the status from pending to confirming, so a double click cannot create two transactions, then saves the record with source "copilot".'),
  P('The engine is chosen per request. If GEMINI_API_KEY is set in server/.env, Gemini answers; if the key is missing, the free-tier quota is exhausted (the server then waits 60 seconds before trying Gemini again) or the network fails, a rule-based offline engine takes over. It recognises intents such as summaries, comparisons, budgets and logging, parses amounts ("₹450", "2.5k", "1.5 lakh"), dates ("yesterday", "5 Nov"), categories and merchants, calls the same tools and fills reply templates. The chat header shows which engine produced each answer.'),
  P('Privacy: when Gemini is enabled, the user’s question and the figures returned by the tools are sent to Google to generate the reply. The settings page states this. The same tool layer also powers the "What stands out this month" insight cards on the dashboard.'),
  H2('6.9 Security'),
  ...bullets([
    'Passwords hashed with bcrypt (cost 10); the hash field is excluded from queries and from every JSON response.',
    'Sessions are signed JWTs in an httpOnly cookie with SameSite=Lax, so scripts cannot read the token and other sites cannot send it with a POST. A Bearer header is accepted for API clients.',
    'One generic message for a wrong email or password, so accounts cannot be discovered by trying emails.',
    'helmet security headers, CORS limited to the web origin, JSON body limit of 100 KB, rate limits of 30 failed sign-in attempts per 15 minutes and 20 Copilot messages per minute.',
    'Every query filters by the signed-in user; requests for another user’s records return 404, so their existence is not revealed.',
    'Secrets such as JWT_SECRET and GEMINI_API_KEY live in server/.env, which is listed in .gitignore; only a placeholder .env.example is committed.',
  ]),
  H2('6.10 Testing'),
  P(`The suite has ${TOTAL_TESTS} automated tests, all passing on the final run. Unit tests cover pure logic. API integration tests send real HTTP requests to the Express app with Supertest against a separate MongoDB test database that is wiped before each test. Component tests render React components in jsdom. End-to-end tests drive the complete stack in Google Chrome with Playwright, each registering a fresh user.`),
  ...table(
    ['Layer', 'Tool', 'Tests', 'What it covers'],
    [
      ['Unit', 'Vitest', String(T.shared + T.serverUnit), 'Money parsing and formatting, IST dates, shared schemas, Copilot parser and intent router, Gemini provider loop with a fake client, seed generator'],
      ['API integration', 'Vitest + Supertest + MongoDB', String(T.serverIntegration), 'Auth, categories, transactions, budgets, analytics with hand-computed totals, Copilot endpoints and engine fallback'],
      ['Component', 'Vitest + React Testing Library', String(T.client), 'API client, filter reducer, transaction form validation, KPI strip, Copilot draft card'],
      ['End to end', 'Playwright (Chrome)', String(T.e2e), 'Sign-up and sign-in, CRUD with dashboard totals, filters, undo, validation, Copilot confirm, budget warning'],
    ],
    [1.5, 2.3, 0.8, 4.6],
    { boldFirst: true, align: [undefined, undefined, AlignmentType.CENTER] },
  ),
  ...figure('diagram-tdd', 'The red, green, refactor loop used for every feature, and the test pyramid with counts from the final run.'),
  P(`Server coverage on the final run: ${cov.statements}% of statements, ${cov.branches}% of branches and ${cov.functions}% of functions. The React pages are covered by the end-to-end suite rather than by unit tests, so client unit coverage is lower by design.`),
  H3('Selected test cases'),
  ...table(
    ['ID', 'Scenario', 'Input', 'Expected result', 'Result'],
    [
      ['TC01', 'Rupee parsing', '"1,23,456.78"', '12345678 paise', 'Pass'],
      ['TC02', 'Reject sub-paise amount', '"12.345"', 'Error: at most 2 decimal places', 'Pass'],
      ['TC03', 'Register', 'Valid name, email, password', '201, httpOnly cookie, 17 categories created, no hash in response', 'Pass'],
      ['TC04', 'Duplicate email', 'Same email twice', '409 "already registered"', 'Pass'],
      ['TC05', 'Wrong password', 'Known email, bad password', '401 with the same message as an unknown email', 'Pass'],
      ['TC06', 'Protected route', 'GET /auth/me with no cookie', '401 UNAUTHENTICATED', 'Pass'],
      ['TC07', 'Create transaction', '45050 paise, Groceries, 8 Nov', '201 with populated category, source manual', 'Pass'],
      ['TC08', 'Float amount to API', 'amount 450.5', '400, error on field amount', 'Pass'],
      ['TC09', 'Type mismatch', 'Income using the Groceries category', '400 mentioning the category', 'Pass'],
      ['TC10', 'Data isolation', 'User B reads user A’s transaction', '404', 'Pass'],
      ['TC11', 'Filters', 'from/to, min/max, payment method, search', 'Only matching rows, totals for the filtered set', 'Pass'],
      ['TC12', 'CSV export', 'type=expense', 'text/csv attachment, header plus one row per expense', 'Pass'],
      ['TC13', 'Delete category in use', 'Groceries with 1 transaction', '409 "used by 1 transaction"', 'Pass'],
      ['TC14', 'Budget status', '₹10,000 limit, ₹7,500 spent', 'spent 750000, remaining 250000, 75%, warning', 'Pass'],
      ['TC15', 'Monthly summary', 'October fixture', 'Income ₹1,00,000, expense ₹37,000, savings rate 63%, change +25% / +48%', 'Pass'],
      ['TC16', 'IST bucketing', 'Expense at 00:30 IST on 1 Nov', 'Counted in November, not October', 'Pass'],
      ['TC17', 'Copilot draft', '"add 450 for groceries yesterday"', 'Draft of 45000 paise in Groceries; nothing saved until confirm', 'Pass'],
      ['TC18', 'Double confirm', 'Confirm the same draft twice', 'First 200, second 409', 'Pass'],
      ['TC19', 'Gemini failure', 'Gemini provider throws 429', 'Reply still returned by the offline engine', 'Pass'],
      ['TC20', 'Dashboard update (E2E)', 'Add salary and two expenses in the UI', 'KPI strip and balance show the new totals', 'Pass'],
      ['TC21', 'Undo delete (E2E)', 'Delete a row, click Undo', 'Row removed, then restored', 'Pass'],
      ['TC22', 'Form validation (E2E)', 'Submit an empty or invalid form', 'Inline messages, no request saved', 'Pass'],
    ],
    [0.7, 1.8, 2.3, 3.3, 0.9],
    { boldFirst: true, align: [undefined, undefined, undefined, undefined, AlignmentType.CENTER] },
  ),
  H3('Handling common failures'),
  ...bullets([
    'Invalid input returns 400 with field-level messages that the form shows next to the right input.',
    'An expired or tampered session returns 401; the app clears its cached user and shows the sign-in page.',
    'If the API is down, the client shows "Can’t reach the Kosha server" instead of a blank screen, with a retry button on failed panels.',
    'If MongoDB is not running, the server exits with a message telling the user to run docker compose up.',
    'Copilot keeps working when Gemini is unavailable, and drafts cannot be saved twice.',
  ]),
  H2('6.11 Running the project'),
  P('The demo login from the seed dataset is demo@kosha.app with password Demo@1234 (local development only).'),
  ...code([
    'git clone https://github.com/biswas2200/financial-managment-mern.git && cd financial-managment-mern',
    'docker compose up -d            # MongoDB 7 + mongo-express; restores the seed dataset',
    'npm install',
    'cp server/.env.example server/.env   # optional: add GEMINI_API_KEY',
    'npm run dev                     # API on http://localhost:5000, app on http://localhost:5173',
    'npm test                        # shared, server and client tests',
    'npm run e2e                     # Playwright journeys in Chrome',
  ]),
];

// ---------- 7. Results ----------
const copilotCaption =
  ENGINE === 'gemini'
    ? 'Copilot answering from the user’s data with the Gemini engine, and a drafted expense waiting for confirmation.'
    : 'Copilot answering from the user’s data (offline engine shown; the badge switches to Gemini when a key is configured), and a drafted expense waiting for confirmation.';

const results = [
  H1('7. Results'),
  P('The screenshots were captured from the running application on the seed dataset with a headless Chrome browser at 1440 x 900, using the script in e2e/capture-screenshots.js. Every figure shows live data served by the API.'),
  H2('7.1 Sign-in and dashboard'),
  ...figure('login', 'Sign-in page. The demo account button fills the seed-dataset credentials.'),
  ...figure('dashboard-full', 'Dashboard: balance card, insights, the month’s income, spending, savings and savings rate, 12-month income and spending, category ranking, daily heatmap, budgets and recent activity.', 5.5),
  ...figure('dashboard-dark', 'Dashboard in the dark theme.'),
  H2('7.2 Transactions'),
  ...figure('transactions', 'Transactions grouped by day with category, payment method and signed amounts, plus filters, sort and CSV export.'),
  ...figure('transactions-filtered', 'Expenses filtered by the search "swiggy". The filters are kept in the URL and the totals reflect the filtered set.'),
  ...figure('add-transaction', 'Add transaction dialog: type, amount in rupees, date, category filtered by type, payment method, description, merchant and notes.'),
  ...figure('form-validation', 'Validation: the same Zod schema as the API blocks an amount with three decimals and a missing description.'),
  H2('7.3 Analytics and budgets'),
  ...figure('analytics-full', 'Analytics over six months: savings rate, spending by weekday with the peak day emphasised, category trends as small multiples, top merchants and a category breakdown table.', 5.8),
  ...figure('budgets', 'Budgets for the month with spent, limit, percentage and status. Over-budget categories carry an icon and a label as well as colour.'),
  H2('7.4 Copilot and settings'),
  ...figure('copilot', copilotCaption),
  ...figure('settings', 'Settings: profile, password, theme, category management with usage counts, and the active Copilot engine.'),
  H2('7.5 Mobile layout and database'),
  ...figurePair('mobile-dashboard', 'mobile-transactions', 'Mobile layout at 390 px: the sidebar becomes a bottom tab bar and tables become stacked rows.'),
  ...(manifest['database'] ? figure('database', 'The kosha database in mongo-express, showing the collections restored from the seed dump.') : []),
  ...(manifest['database-transactions'] ? figure('database-transactions', 'Transaction documents in MongoDB: amounts are integers in paise and every document carries its user id.') : []),
  H2('7.6 Test results'),
  ...figure('tests-server', `Server suite: ${T.server} tests across ${count(ev('server-tests.txt'), /Test Files\s+(\d+) passed/)} files with the coverage summary.`),
  ...figure('tests-unit-client', `Shared package (${T.shared} tests) and React component tests (${T.client} tests).`),
  ...figure('tests-e2e', `End-to-end journeys in Google Chrome (${T.e2e} tests).`),
];

// ---------- 8. Conclusion ----------
const conclusion = [
  H1('8. Conclusion'),
  P('Kosha meets the objectives set in section 4.4. A user can sign up, record income and expenses with full create, read, update and delete, and see total income, total expenses and the current balance on a dashboard that updates as soon as data changes. Spending habits are visible as a 12-month cash flow, a category ranking, a daily heatmap, weekday patterns, category trends and top merchants. Monthly budgets warn at 75% and above 100%. Copilot answers questions from the user’s own figures through Gemini function calling and drafts entries that are saved only on confirmation, and it still works offline.'),
  P(`On the engineering side, the project showed how much a few early decisions help later. Storing money as integer paise and fixing the time zone to IST removed whole classes of rounding and month-boundary bugs. Computing reports with MongoDB aggregation kept every dashboard request under 20 ms on a year of data. Shared Zod schemas meant the browser and the server never disagreed about what is valid, and writing tests first produced ${TOTAL_TESTS} tests that made the later UI and agent work safe to change.`),
  H2('Limitations'),
  ...bullets([
    'Transactions are entered by hand or through Copilot; there is no bank, UPI or SMS import.',
    'Only Indian rupees are supported, and there are no shared or family accounts.',
    'The Gemini free tier has rate limits; under heavy use Copilot falls back to the less flexible offline engine.',
    'The application has been run locally only; it has not been deployed or load tested.',
  ]),
  H2('Future scope'),
  ...bullets([
    'Recurring transactions (rent, subscriptions) created automatically each month.',
    'Import from bank statements (CSV or PDF) and categorisation suggestions for imported rows.',
    'Receipt photos with text extraction to pre-fill the amount and merchant.',
    'Savings goals and reminders when a budget reaches its warning level.',
    'An installable progressive web app with offline entry that syncs later.',
    'Deployment with MongoDB Atlas, HTTPS and continuous integration running the test suite on every push.',
  ]),
];

// ---------- 9. GitHub proof ----------
const github = [
  H1('9. GitHub proof'),
  new Paragraph({ spacing: { after: 140 }, children: [run('Repository: ', { bold: true }), link(REPO, REPO)] }),
  P(`The complete source code, seed data dump, tests, diagrams and this report are on GitHub. Work was pushed to the main branch after every step, so the history shows the order of development: ${COMMITS} commits at the time of writing, with each feature introduced by a failing test commit marked "(red)" and completed by a passing "(green)" commit.`),
  ...(manifest['github-repo'] ? figure('github-repo', 'Repository home page on GitHub.') : [Note('[Insert screenshot of the repository home page]')]),
  ...(manifest['github-commits'] ? figure('github-commits', 'Commit history on the main branch, showing the test-first red and green commits.') : [Note('[Insert screenshot of the commit history]')]),
];

// ---------- 10. References ----------
const refs = [
  ['MongoDB, Inc. "Aggregation Operations." MongoDB Manual', 'https://www.mongodb.com/docs/manual/aggregation/'],
  ['MongoDB, Inc. "$facet", "$lookup" and "$dateToString" aggregation stage and operator reference', 'https://www.mongodb.com/docs/manual/reference/operator/aggregation/'],
  ['Mongoose. "Mongoose v8 Documentation"', 'https://mongoosejs.com/docs/'],
  ['OpenJS Foundation. "Express 5.x API Reference" and "Migrating to Express 5"', 'https://expressjs.com/en/5x/api.html'],
  ['Meta Open Source. "React Documentation"', 'https://react.dev/'],
  ['TanStack. "TanStack Query v5: Query Invalidation and Optimistic Updates"', 'https://tanstack.com/query/latest/docs/framework/react/overview'],
  ['Zod. "Zod Documentation"', 'https://zod.dev/'],
  ['React Hook Form. "Get Started"', 'https://react-hook-form.com/get-started'],
  ['Recharts. "Recharts API"', 'https://recharts.org/en-US/api'],
  ['Google. "Function calling with the Gemini API." Google AI for Developers', 'https://ai.google.dev/gemini-api/docs/function-calling'],
  ['Google. "Google Gen AI SDK for JavaScript (@google/genai)"', 'https://github.com/googleapis/js-genai'],
  ['Vitest. "Vitest Guide"', 'https://vitest.dev/guide/'],
  ['Microsoft. "Playwright Test Documentation"', 'https://playwright.dev/docs/intro'],
  ['Testing Library. "React Testing Library"', 'https://testing-library.com/docs/react-testing-library/intro/'],
  ['OWASP Foundation. "Password Storage Cheat Sheet"', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html'],
  ['OWASP Foundation. "Session Management Cheat Sheet"', 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'],
  ['OWASP Foundation. "CSV Injection"', 'https://owasp.org/www-community/attacks/CSV_Injection'],
  ['W3C. "Web Content Accessibility Guidelines (WCAG) 2.2"', 'https://www.w3.org/TR/WCAG22/'],
  ['Docker, Inc. "mongo: Docker Official Image" (initialisation scripts)', 'https://hub.docker.com/_/mongo'],
  ['Ek Type. "Anek" type family, Google Fonts', 'https://fonts.google.com/specimen/Anek+Latin'],
  ['Beck, K. Test-Driven Development: By Example. Addison-Wesley, 2002', null],
];
const references = [
  H1('10. References'),
  ...refs.map(([text, url]) => {
    return new Paragraph({
      numbering: { reference: 'numbers', level: 0, instance: 999 },
      spacing: { after: 90, line: 288 },
      children: [run(`${text}${url ? '. ' : '.'}`), ...(url ? [link(url, url)] : [])],
    });
  }),
];

// ---------- assemble ----------
const footer = new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ['Kosha project report, page ', PageNumber.CURRENT], font: FONT, size: 17, color: MUTED })],
    }),
  ],
});

const doc = new Document({
  creator: 'Kosha project team',
  title: 'Kosha: MERN Project Report',
  description: 'Full-Stack Web Development Using MERN (25MCA301) project report',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 34, bold: true, color: BRAND }, paragraph: { spacing: { before: 0, after: 220 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: INK }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: MUTED }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 340 } } } }] },
    ],
  },
  sections: [
    {
      properties: {
        titlePage: true,
        page: { margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } },
      },
      footers: { default: footer, first: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: [...cover, ...contents, ...rubrics, ...contribution, ...about, ...requirements, ...methodology, ...results, ...conclusion, ...github, ...references],
    },
  ],
});

const out = path.join(HERE, 'Kosha_Project_Report.docx');
fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log(`Wrote ${path.relative(ROOT, out)} (${Math.round(fs.statSync(out).size / 1024)} KB), ${figureNo} figures, ${TOTAL_TESTS} tests, ${COMMITS} commits`);

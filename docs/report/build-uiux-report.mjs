/**
 * Builds docs/report/Kosha_UIUX_LA_Project_Report.docx: the LA project report for
 * UI/UX Design & Product Management (25MCA313), in the department's LA report layout
 * (page border, Times New Roman, 14 chapters, rubric mapping).
 *
 *   python3 docs/report/prepare_images.py      # once, or after new screenshots
 *   node docs/report/build-uiux-report.mjs     # writes the .docx
 *   node docs/report/build-uiux-report.mjs --pages   # also fills the contents page numbers (needs LibreOffice)
 *
 * The earlier report for 25MCA301 (build-report.mjs) is left as it was.
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
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
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
const OUT = path.join(HERE, 'Kosha_UIUX_LA_Project_Report.docx');
const PAGES_FILE = path.join(TMP, 'uiux-pages.json');
const manifest = JSON.parse(fs.readFileSync(path.join(TMP, 'manifest.json'), 'utf8'));
const pages = fs.existsSync(PAGES_FILE) ? JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8')) : {};

// ---------------------------------------------------------------- facts from the repository
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT }).toString().trim();
const COMMITS = Number(git('rev-list --count HEAD'));
const RED = Number(execSync('git log --oneline | grep -c "(red)" || true', { cwd: ROOT, shell: '/bin/bash' }).toString().trim());
const SOURCE_LINES = Number(execSync("git ls-files client/src server/src shared/src | grep -v 'test\\.' | xargs wc -l | tail -1 | awk '{print $1}'", { cwd: ROOT, shell: '/bin/bash' }).toString().trim());
const T = { shared: 117, server: 485, client: 496, e2e: 128 }; // from the last full run of every suite
const TOTAL_TESTS = T.shared + T.server + T.client + T.e2e;
const REPO = 'https://github.com/biswas2200/financial-managment-mern';

// ---------------------------------------------------------------- layout, copied from the department's reference report
const FONT = 'Times New Roman';
const BLUE = '1F4E79';
const GREY = '646464';
const PAGE_W = 9936; // Letter, 8.5in, margins 0.75in top/bottom, 0.75in right, 0.85in left
const BODY = 24; // 12 pt
const CELL = 21; // 10.5 pt

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: BODY, ...o });

/** Inline **bold** and `code`. */
function runs(text, base = {}) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**')) return run(part.slice(2, -2), { ...base, bold: true });
      if (part.startsWith('`')) return run(part.slice(1, -1), { ...base, font: 'Courier New', size: (base.size ?? BODY) - 3 });
      return run(part, base);
    });
}

const P = (text, o = {}) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 140, line: 300 }, children: runs(text, o.run), ...o.para });
const center = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 120 }, children: [run(text, o.run)] });
const H1 = (text) => new Paragraph({ pageBreakBefore: true, keepNext: true, spacing: { before: 0, after: 200 }, children: [run(text, { bold: true, size: 32, color: BLUE })] });
const H2 = (text) => new Paragraph({ keepNext: true, spacing: { before: 220, after: 100 }, children: [run(text, { bold: true, size: 26, color: BLUE })] });
const H3 = (text) => new Paragraph({ keepNext: true, spacing: { before: 140, after: 60 }, children: [run(text, { bold: true, size: 24, color: BLUE })] });
const link = (text, url) => new ExternalHyperlink({ link: url, children: [run(text, { color: BLUE, underline: {} })] });

const bullets = (items) => items.map((i) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: runs(i), numbering: { reference: 'bullets', level: 0 }, spacing: { after: 70, line: 288 } }));
let listNo = 0;
const numbered = (items) => {
  listNo += 1;
  const instance = listNo;
  return items.map((i) => new Paragraph({ children: runs(i), numbering: { reference: 'numbers', level: 0, instance }, spacing: { after: 70, line: 288 } }));
};

// Black single borders on every table, as in the reference.
const line = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const BORDERS = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };

function cell(content, width, { header = false, align, bold = false, fill } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(
    (c) => new Paragraph({ alignment: align ?? AlignmentType.LEFT, spacing: { after: 30, line: 264 }, children: runs(c, { size: CELL, bold: header || bold, color: header ? 'FFFFFF' : undefined }) }),
  );
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: BLUE } : fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: paras,
  });
}

const scale = (weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / sum) * PAGE_W));
  widths[widths.length - 1] += PAGE_W - widths.reduce((a, b) => a + b, 0);
  return widths;
};

/** headers: column titles; rows: arrays of strings; weights: relative column widths; o.center: indexes of centred columns. */
function table(headers, rows, weights, o = {}) {
  const widths = scale(weights);
  const mid = (i) => (o.center?.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT);
  const trs = [new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], { header: true, align: AlignmentType.CENTER })) })];
  rows.forEach((r) => trs.push(new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { align: mid(i), bold: o.boldFirst && i === 0 })) })));
  return [new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: BORDERS, rows: trs }), new Paragraph({ spacing: { after: 160 }, children: [] })];
}

let figureNo = 0;
function figure(key, text, widthIn = 6.0) {
  const m = manifest[key];
  if (!m) throw new Error(`Missing image ${key}`);
  figureNo += 1;
  const w = Math.round(widthIn * 96);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [new ImageRun({ type: m.type, data: fs.readFileSync(path.join(TMP, m.file)), transformation: { width: w, height: Math.round((m.height / m.width) * w) } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: [run(`Figure ${figureNo}: `, { bold: true, size: 20 }), run(text, { size: 20, italics: true })] }),
  ];
}

// ---------------------------------------------------------------- the team
const MEMBERS = [
  { n: 1, name: 'AMITOSH BISWAS', usn: 'NB25MCA005', role: 'Product owner and backend: product vision and backlog, Express REST APIs, authentication and security, Kosha Copilot and the Gemini integration.' },
  { n: 2, name: 'M N BHAVANI', usn: 'NB25MCA020', role: 'UI/UX lead: user research and personas, wireframes, design system (colour, type, themes, motion) and the React screens.' },
  { n: 3, name: 'PALLAVI K A', usn: 'NB25MCA030', role: 'Data and analytics: MongoDB schema and indexes, aggregation pipelines, charts and market screens, seed data and sample accounts.' },
  { n: 4, name: 'RAJATH R METRI', usn: 'NB25MCA033', role: 'Quality and integration: usability and accessibility review, automated tests, Learn and Discussions content, frontend and backend integration, documentation.' },
];

// ---------------------------------------------------------------- cover page
const cover = [
  center('NITTE MEENAKSHI INSTITUTE OF TECHNOLOGY', { run: { bold: true, size: 28, color: BLUE }, after: 80 }),
  center('DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS', { run: { bold: true, size: 24 }, after: 40 }),
  center('(MCA)', { run: { bold: true, size: 24 }, after: 360 }),
  center('LA PROJECT REPORT', { run: { bold: true, size: 28, color: BLUE }, after: 120 }),
  center('ON', { run: { bold: true, size: 28, color: BLUE }, after: 120 }),
  center('KOSHA – PERSONAL FINANCE TRACKER', { run: { bold: true, size: 34, color: BLUE }, after: 100 }),
  center('A React, Node.js, Express and MongoDB Based Web Application', { run: { size: 24 }, after: 360 }),
  center('Course Name : UI/UX DESIGN & PRODUCT MANAGEMENT', { run: { bold: true, size: 24 }, after: 60 }),
  center('Course Code: 25MCA313', { run: { bold: true, size: 24 }, after: 360 }),
  center('A project report submitted in partial fulfilment of the academic requirements for the', { run: { size: 22 }, after: 120 }),
  center('Master of Computer Applications (MCA)', { run: { size: 22 }, after: 300 }),
  center('Submitted by', { run: { bold: true, size: 22 }, after: 100 }),
  ...MEMBERS.map((m) => center(`${m.name} – ${m.usn}`, { run: { size: 22 }, after: 60 })),
  center('', { after: 200 }),
  center('Submitted to', { run: { bold: true, size: 22 }, after: 100 }),
  center('Dr. Vishwanatha C R', { run: { bold: true, size: 24 }, after: 40 }),
  center('Designation: Assistant Professor (Subject Teacher)', { run: { size: 22 }, after: 280 }),
  center('Department of Master of Computer Applications', { run: { bold: true, size: 22 }, after: 80 }),
  center('Nitte Meenakshi Institute of Technology, Bengaluru', { run: { bold: true, size: 22 }, after: 80 }),
  center('Academic Year: 2026–2027', { run: { bold: true, size: 22 }, after: 0 }),
];

// ---------------------------------------------------------------- 1. members and tasks
const team = [
  H1('1. PROJECT MEMBERS AND ASSIGNED TASKS'),
  P('Kosha is developed as an academic project for the course UI/UX Design & Product Management (25MCA313). The four members worked as one product team: one person owned the product backlog and the server, one led the interface design, one owned data and analytics, and one owned quality and integration.'),
  ...table(['Sl. No.', 'Member Name', 'USN / Registration No.', 'Assigned Responsibility'], MEMBERS.map((m) => [String(m.n), m.name, m.usn, m.role]), [0.7, 1.9, 1.6, 4.6], { center: [0, 2] }),
  H2('1.1 Project Team Responsibilities'),
  P('The product needs coordination between product management, interface design, data work and quality assurance. The main work areas of each member are listed below.'),
  ...bullets([
    '**Product ownership and backend:** product vision, backlog and priorities; Express REST APIs, authentication, session cookie, rate limits, Kosha Copilot with Google Gemini, market-data services.',
    '**UI/UX design and frontend:** personas, user journeys, information architecture, wireframes, the design system (colour tokens, type, dark theme, motion, icons) and the React screens for the dashboard, transactions, budgets and settings.',
    '**Data and analytics:** MongoDB collections and indexes, aggregation pipelines for the analytics, charts and tables, the Markets screens, the seed dataset and the sample accounts used for demonstration.',
    '**Quality, content and integration:** usability and accessibility review against Nielsen\'s heuristics, unit, integration and end-to-end tests, Learn guides, Discussions, frontend and backend integration, and this report.',
  ]),
  H3('Module ownership'),
  ...table(
    ['Module', 'Primary owner', 'Supported by'],
    [
      ['Accounts, consent, cookie choice, profile', 'Amitosh Biswas', 'Rajath R Metri (tests)'],
      ['Dashboard, transactions, calendar, categories', 'M N Bhavani', 'Amitosh Biswas (APIs)'],
      ['Budgets and balance', 'M N Bhavani', 'Pallavi K A (aggregations)'],
      ['Analytics and charts', 'Pallavi K A', 'M N Bhavani (chart design)'],
      ['Markets, watchlist', 'Pallavi K A', 'Amitosh Biswas (data service)'],
      ['Kosha Copilot', 'Amitosh Biswas', 'Rajath R Metri (tests)'],
      ['Learn and Discussions', 'Rajath R Metri', 'M N Bhavani (reader design)'],
      ['Design system, landing page, themes, PWA', 'M N Bhavani', 'Amitosh Biswas (service worker)'],
      ['Test strategy, usability review, report', 'Rajath R Metri', 'All members'],
    ],
    [3.6, 1.9, 2.8],
  ),
];

// ---------------------------------------------------------------- abstract
const abstract = [
  H1('ABSTRACT'),
  P('Kosha is a web-based personal finance tracker for people in India. It brings a person\'s income, spending, budgets, balance and learning about money into one place, and adds an assistant, Kosha Copilot, that answers questions about the person\'s own numbers. The project addresses a practical design problem: money records are usually scattered across bank messages, UPI histories and spreadsheets, and the tools that gather them are often dense, generic and silent about why a number looks the way it does.'),
  P('The application provides sign-up with recorded consent, a dashboard with an explained balance, fast entry of income and expenses (also by keyboard), a spending calendar, monthly budgets per category, analytics, end-of-day market data from NSE and AMFI with a watchlist, original Learn guides, a discussion space with separate like and dislike counts, and Kosha Copilot, which drafts changes that are only saved after the person presses Confirm. It works as an installable app on a phone, has light and dark themes, and asks about cookies once with two equal choices that follow the account.'),
  P(`The report treats Kosha as a UI/UX and product management exercise. It describes the target users as personas, the user journeys and information architecture that follow from them, a design system, the product backlog with priorities, the release plan, and how usability was reviewed against Nielsen's ten heuristics. The product is built with React 18, Vite, Tailwind CSS 4 and TanStack Query on the client; Node.js, Express 5 and Mongoose on the server; MongoDB for storage; and the Google Gemini API for the assistant. It was built test-first: the repository holds ${COMMITS} commits, ${RED} of which are failing tests committed before the code that fixes them, and ${TOTAL_TESTS.toLocaleString('en-IN')} automated tests pass.`),
  P('Keywords: UI/UX design, product management, personal finance, personas, design system, accessibility, MERN, React, Express, MongoDB, Gemini.'),
  H3('Project Contribution and Expected Outcome'),
  P('By putting records, budgets, market numbers and guidance in one consistent interface, Kosha lets a person see where money went, understand why, and decide what to do next without leaving the app. The expected outcome for evaluation is a working product that can be demonstrated for several kinds of user, a documented design and product process, and test evidence.'),
  H3('System Boundary'),
  P('Kosha does not connect to a bank, does not move money, and does not give investment advice. Every balance and transaction is typed in by the person, or comes from a clearly labelled demonstration bank that uses made-up figures. Market figures are end-of-day and carry their date. Copilot explains numbers; it will not tell anyone what to buy or sell.'),
];

// ---------------------------------------------------------------- contents page
const CHAPTERS = [
  ['1', 'Introduction and Project Background'],
  ['2', 'Problem Identification, Objectives and Scope'],
  ['3', 'Existing System and Proposed Solution'],
  ['4', 'Requirements and Feasibility Study'],
  ['5', 'System Architecture and Design'],
  ['6', 'Process Flow, Journeys and Use Cases'],
  ['7', 'Database Design'],
  ['8', 'Technology Stack and Methodology'],
  ['9', 'Frontend Implementation and UI/UX Design'],
  ['10', 'Backend Implementation and API Design'],
  ['11', 'Security and Validation'],
  ['12', 'Testing Strategy, Test Cases and Usability Review'],
  ['13', 'Results, Limitations and Future Enhancements'],
  ['14', 'Conclusion, References and Rubric Mapping'],
];
const contents = [
  H1('TABLE OF CONTENTS'),
  ...table(['CHAPTER', 'TITLE', 'PAGE'], CHAPTERS.map(([n, t]) => [n, t, String(pages[n] ?? '')]), [1.5, 7.0, 1.1], { center: [0, 2] }),
];

// ---------------------------------------------------------------- chapter 1
const ch1 = [
  H1('CHAPTER 1 – INTRODUCTION AND PROJECT BACKGROUND'),
  H2('1.1 Introduction'),
  P('Money decisions are made many times a week and mostly from memory: what was spent on food this month, whether the rent has gone out, whether there is room for a trip. The information exists, but it lives in bank messages, UPI apps, notes and spreadsheets. A single, calm place that gathers it and explains it can change how a person behaves with money. That is as much a design problem as a technical one: the interface decides whether the person looks at it every day or abandons it after a week.'),
  H2('1.2 Project Overview'),
  P('Kosha is a personal finance web application. A person records income and expenses in seconds, sees the month at a glance, sets budgets, follows end-of-day market data, reads short guides, takes part in discussions, and asks Kosha Copilot questions about their own figures. The name is a Sanskrit word for a treasury. The interface works on a laptop and on a phone, in a light and a dark theme, and can be installed as an app.'),
  H2('1.3 Project Context'),
  P('The project is the LA (learning assessment) project for UI/UX Design & Product Management (25MCA313). The course asks for evidence of a design process and of product thinking, not only of working code. For that reason this report records who the users are (personas), what they need (user stories and priorities), how the screens are organised (information architecture), why the interface looks the way it does (design system), how the product was released in steps (roadmap) and how it was evaluated (heuristic review and automated tests). The product is implemented with the MERN stack so that the design decisions are real, running software.'),
  H2('1.4 Intended Users'),
  ...bullets([
    '**People who want to understand their spending:** students, salaried employees, freelancers, homemakers and retirees who log income and expenses and want the month explained.',
    '**People who want to learn and follow markets calmly:** first-time investors who need plain-language guides, end-of-day figures with their dates and a watchlist, without being told what to buy.',
    '**Project evaluators:** staff who review the design process, the working product and the evidence of testing.',
  ]),
  P('Section 2.3 describes eight design personas in detail. Each has a sample account in the product, so the same people appear in the report and in the demonstration.'),
  H2('1.5 Report Organization'),
  P('Chapters 2 to 4 define the problem, the existing alternatives, the proposed solution and the requirements, including user stories and priorities. Chapters 5 to 8 describe the architecture, the user flows, the database and the technology and methodology. Chapters 9 to 11 describe the interface, the API and security. Chapters 12 and 13 present testing, the usability review, results and limitations. Chapter 14 concludes and maps the report to the evaluation rubric.'),
  H2('1.6 Motivation'),
  P('Many finance apps start with a large form and a wall of charts. The motivation here was to start from the person: make the first action obvious, explain every number that might surprise someone, ask before changing anything, and be honest when something is unknown. These are design choices, and each one has a counterpart in the code and in a test.'),
  H2('1.7 Application Workflow at a Glance'),
  P('A visitor sees the landing page, creates an account and accepts the Terms and Privacy Policy. The first screen is the overview: the balance, what stands out this month, the four key figures and a short getting-started card. From any screen, the key N (or the Add expense button) opens the entry form. Budgets, analytics, markets, guides and discussions are one click away in a sidebar grouped by what the person is doing: Money, Invest, Learn and talk, and Assistant. On a phone, a bottom tab bar keeps four everyday places and a More sheet lists the rest.'),
  H2('1.8 Assumptions'),
  P('The product assumes that people enter accurate amounts and dates, that MongoDB is reachable by the server, that a modern browser is used, and that market data from NSE and AMFI is published on the usual schedule. When a data source cannot be reached, the product says so instead of showing invented figures.'),
];

// ---------------------------------------------------------------- chapter 2
const PERSONAS = [
  ['Kabir Sethi, 22, Pune', 'Final-year engineering student on a monthly allowance, with tuition gigs and a summer internship.', 'Stretch a small income across the month; see where chai and travel add up.', 'Quick entry, small amounts, a clear month view; no jargon.', 'kabir@kosha.app'],
  ['Nandini Chauhan, 38, Jaipur', 'Runs a joint-family household, with a little tailoring income and school fees every term.', 'Plan for large, predictable costs and festival spikes.', 'Household allowance as income, budgets for groceries and education, a calm interface.', 'nandini@kosha.app'],
  ['Karthik Raman, 31, Chennai', 'Freelance designer with a retainer, lumpy project payments, tools to pay for and advance tax.', 'Know whether a thin month is a problem; set money aside for tax.', 'Custom categories (tools, tax), trend charts, a balance that explains itself.', 'karthik@kosha.app'],
  ['Vikas Agarwal, 45, Lucknow', 'Owns a neighbourhood store: weekly takings, wholesale stock, wages, a home loan.', 'Keep shop money and home money readable in one place.', 'Custom income and expense categories, large amounts, clear monthly totals.', 'vikas@kosha.app'],
  ['Mohan Pillai, 68, Kochi', 'Retired bank manager with a pension, rent and deposit interest; medicines and check-ups are the main costs.', 'Watch health spending and keep a steady monthly pattern.', 'Large readable text, light screens, simple navigation, privacy.', 'mohan@kosha.app'],
  ['Jasleen Bhatia, 30, Chandigarh', 'Recently married, saving every month for a home down payment, with a car EMI and shared rent.', 'Protect the monthly transfer to the home fund.', 'A "Home fund" category, budgets that warn early, savings rate on the overview.', 'jasleen@kosha.app'],
  ['Rohit Chaudhary, 28, Gurugram', 'Early in his career and investing every month through SIPs; follows a few stocks.', 'See savings and investing in one place and understand market terms.', 'Markets and watchlist, Learn guides, Copilot that explains without advising.', 'rohit@kosha.app'],
  ['Farah Siddiqui, 34, Hyderabad', 'Resident doctor on a stipend, with night-duty income, an education loan and late meals.', 'Log entries quickly between shifts.', 'Keyboard and phone entry, dark theme for night use, Copilot to log "Spent 300 on Uber yesterday".', 'farah@kosha.app'],
];
const ch2 = [
  H1('CHAPTER 2 – PROBLEM IDENTIFICATION, OBJECTIVES AND SCOPE'),
  H2('2.1 Problem Identification'),
  P('People with regular income often cannot say where the money went. The causes are practical. Records are spread across bank and UPI messages. Manual tracking is easy to start and hard to keep up. Tools that automate it can feel opaque: a balance appears, but nothing says how it was made. Finally, money information and money learning are separate, so a person who wants to understand a market term must leave the tool.'),
  H2('2.2 Problem Statement'),
  P('To design and build a personal finance product that makes recording a transaction a matter of seconds, explains every figure it shows, keeps the person in control of every change, and places records, budgets, market data and plain-language learning in one coherent interface that works on a phone and a laptop.'),
  H2('2.3 Users and Design Personas'),
  P('The team defined eight personas from the groups the product is meant for. They are **proto-personas**: written by the team from the target groups and from general knowledge of how these groups use money. They were not produced from interviews or surveys, and they are used to test design decisions, not as evidence about a population. Each persona has a sample account in the product with a year of generated activity that fits the story, so any screen can be shown with realistic data.'),
  ...table(['Persona', 'Story', 'Goal', 'What the design gives them', 'Sample account'], PERSONAS, [1.4, 2.1, 1.6, 2.2, 1.5]),
  H2('2.4 Objectives'),
  ...numbered([
    'Let a person record an expense or income from any screen in a few seconds, with the keyboard or on a phone.',
    'Show the month at a glance and explain every figure that might surprise, including a balance below zero.',
    'Let a person set a monthly limit per category and warn before it is crossed.',
    'Provide analytics that answer questions (where did it go, which weekdays, which merchants) and not only charts.',
    'Provide end-of-day market data with its date, from official sources, and never invent a figure.',
    'Provide an assistant that works on the person\'s own data, drafts changes for confirmation, and does not give investment advice.',
    'Provide learning and discussion in the same product, with likes and dislikes counted separately and never negative.',
    'Work on a phone as an installable app, in light and dark themes, and respect privacy choices (cookies, consent, deletion).',
  ]),
  H2('2.5 Scope'),
  P('The scope is a responsive web application with a REST API and a MongoDB database. It includes accounts, transactions, categories, budgets, balance, analytics, markets, a watchlist, Learn, Discussions, the Copilot assistant, settings and privacy controls, and the installable app. It is a learning project that runs locally and is not deployed as a public service.'),
  H2('2.6 Relevance'),
  P('Personal finance is a domain where design quality changes outcomes: a confusing screen leads to unlogged spending, and an opaque number leads to distrust. It is also a domain where product decisions have consequences, such as asking before saving and being honest about unknown data. That makes it a good subject for a UI/UX and product management project.'),
  H2('2.7 Measurable Project Objectives'),
  ...table(
    ['Objective', 'Measure', 'Where it is checked'],
    [
      ['Fast entry', 'Add expense opens from every screen; N and I keyboard shortcuts', 'Client tests and end-to-end shortcuts test'],
      ['Explained numbers', 'A negative balance shows why and how to fix it; KPI tiles carry a help tip', 'Balance end-to-end test and component tests'],
      ['Control', 'No Copilot draft is saved until Confirm', 'Copilot end-to-end test'],
      ['Honesty', 'Unreachable market source returns 503 and the page says so', 'Markets integration tests'],
      ['Phone support', 'No page scrolls sideways at 390 px; tab bar and More sheet', 'Navigation and mobile end-to-end tests'],
      ['Privacy', 'Cookie choice recorded and synced; account deletion removes everything', 'Cookie and discussion end-to-end tests'],
      ['Quality', `${TOTAL_TESTS.toLocaleString('en-IN')} automated tests pass`, 'All suites'],
    ],
    [2.0, 4.6, 3.2],
  ),
  H2('2.8 In-Scope and Out-of-Scope Features'),
  ...table(
    ['In scope', 'Out of scope'],
    [
      ['Manual entry of income and expenses; CSV export', 'Reading bank accounts or SMS automatically'],
      ['Budgets, analytics, spending calendar', 'Bill payment or money movement'],
      ['End-of-day NSE and AMFI data and a watchlist', 'Live prices, trading or investment advice'],
      ['Copilot on the person\'s own data, with confirmation', 'Copilot acting without confirmation'],
      ['Learn guides, discussions, likes and dislikes', 'Moderation tooling and private messages'],
      ['Installable app, light and dark themes', 'Native iOS and Android apps'],
    ],
    [5, 5],
  ),
  H2('2.9 Success Criteria'),
  P('The product is successful for this assessment if a new person can create an account, record income and an expense, understand the overview, set a budget and ask Copilot a question without help; if the same flows work on a phone; if the tests pass; and if the report documents the design and product decisions with evidence.'),
];

// ---------------------------------------------------------------- chapter 3
const ch3 = [
  H1('CHAPTER 3 – EXISTING SYSTEM AND PROPOSED SOLUTION'),
  H2('3.1 Existing Approach'),
  P('People use several approaches today: a notebook or a spreadsheet, the history in a bank or UPI app, and general expense-tracking apps. Each solves part of the problem. A spreadsheet is flexible but slow to update on a phone. A bank history is automatic but shows only that bank, with no budget and no explanation. General apps combine features but are often dense, and they seldom connect to learning or to market information in a way a beginner can follow.'),
  H2('3.2 Limitations Addressed'),
  ...table(
    ['Challenge for the user', 'How Kosha responds'],
    [
      ['Entering a record takes too long on a phone', 'Add expense from every screen, the N key, a single form with category chips, a bottom tab bar on phones'],
      ['A number appears with no explanation', 'A balance below zero is explained and fixable; key figures have help tips; Copilot explains in words'],
      ['Tools change data without asking', 'Copilot only drafts. Nothing is saved until Confirm'],
      ['Charts that do not answer a question', 'Analytics are built around questions: where, which day, which merchant, which category over time'],
      ['Market apps imply certainty', 'Figures are end-of-day, carry their date, and failures are stated'],
      ['Learning is somewhere else', 'Guides open over the page in the same app, and Copilot can explain them'],
      ['Privacy is an afterthought', 'Consent recorded at sign-up, one cookie, an equal-choice cookie banner, full deletion'],
    ],
    [4, 6],
  ),
  H2('3.3 Proposed Solution'),
  P('The proposed solution is a single web product organised by what a person is doing (Money, Invest, Learn and talk, Assistant). The React client talks to an Express REST API, which validates every request, applies the rules and reads or writes MongoDB. Copilot is a service inside the API that calls Google Gemini when it is configured and otherwise uses a plainly labelled offline engine. The same product works as an installable app.'),
  H2('3.4 Benefits'),
  ...bullets([
    'One place for records, budgets, analytics, markets, learning and discussion.',
    'Every figure is explained, dated or sourced.',
    'The person stays in control: confirmation before changes, deletion of everything on request.',
    'A phone-first layout with an installable app, light and dark themes and keyboard shortcuts on a laptop.',
    'Realistic sample accounts that make the product demonstrable for many kinds of user.',
  ]),
  H2('3.5 Constraints'),
  P('The product needs a running MongoDB database and Node.js. Market data depends on the public NSE archive and AMFI (through mfapi.in) being reachable; other sources were tested and are not available to programmatic clients. Gemini needs either an API key or Google application default credentials.'),
  H2('3.6 Comparison of Existing and Proposed Process'),
  P('Previously a person would open a bank app, note an amount, open a spreadsheet, add a row, and later try to remember what the month looked like. In Kosha the person presses N, enters an amount and a category, and presses Save. The overview, the budget bar, the analytics and the calendar update from the same record, and Copilot can answer a question about it.'),
  H2('3.7 Value to Stakeholders'),
  P('For users, Kosha saves time and removes doubt about numbers. For the course, it demonstrates a complete product cycle: users, requirements, design, implementation, testing and evaluation. For the team, it is a shared codebase with a visible history of test-first work.'),
  H2('3.8 Risks in the Proposed Approach'),
  ...table(
    ['Risk', 'Mitigation'],
    [
      ['Market sources change or block access', 'Honest 503 and an explanation; sources documented; tests use fake files'],
      ['Copilot gives a wrong or unwanted answer', 'Tools read only the person\'s data; changes need Confirm; instructed not to advise on buying or selling'],
      ['Personal data exposure', 'Hashed passwords, httpOnly cookie, ownership checks on every query, deletion of an account removes its data'],
      ['A design that suits one persona excludes another', 'Eight personas, a phone layout, dark theme, large readable text, keyboard access'],
      ['Scope growth', 'A prioritised backlog and release plan (Chapter 4 and 13)'],
    ],
    [4, 6],
  ),
];

// ---------------------------------------------------------------- chapter 4
const ch4 = [
  H1('CHAPTER 4 – REQUIREMENTS AND FEASIBILITY STUDY'),
  H2('4.1 Functional Requirements'),
  P('Requirements are written as user stories with a MoSCoW priority (Must, Should, Could). Release 1 contains the Must stories; the other releases are described in Chapter 13.'),
  ...table(
    ['ID', 'User story', 'Persona', 'Priority'],
    [
      ['FR-01', 'As a person, I can create an account, accept the Terms and Privacy Policy, and sign in and out.', 'All', 'Must'],
      ['FR-02', 'As a person, I can add, edit and delete an income or expense with amount, category, date, merchant and note.', 'All', 'Must'],
      ['FR-03', 'As a person, I see my balance, what I earned and spent this month, and what stands out.', 'All', 'Must'],
      ['FR-04', 'As a person, I understand why my balance is below zero and can fix it.', 'Karthik, Kabir', 'Must'],
      ['FR-05', 'As a person, I set a monthly limit per category and am warned as I approach it.', 'Jasleen, Nandini', 'Must'],
      ['FR-06', 'As a person, I add my own categories for my kind of life.', 'Vikas, Karthik', 'Should'],
      ['FR-07', 'As a person, I search, filter and export my transactions, and open a spending calendar.', 'Karthik, Mohan', 'Should'],
      ['FR-08', 'As a person, I see analytics: trend, by category, weekday, merchants.', 'Rohit, Jasleen', 'Should'],
      ['FR-09', 'As a person, I ask Copilot about my own numbers and have it draft entries that I confirm.', 'Farah, Kabir', 'Should'],
      ['FR-10', 'As a learner, I follow end-of-day market data and keep a watchlist.', 'Rohit, Mohan', 'Could'],
      ['FR-11', 'As a learner, I read short guides and ask Copilot to explain them.', 'Rohit, Kabir', 'Could'],
      ['FR-12', 'As a member, I post, comment, like and dislike, with counts that never go below zero.', 'Nandini, Rohit', 'Could'],
      ['FR-13', 'As a person, I install the app on my phone and use it with a bottom tab bar.', 'Farah, Kabir', 'Should'],
      ['FR-14', 'As a person, I choose light or dark theme and answer a cookie banner once, with my choice following me.', 'All', 'Should'],
      ['FR-15', 'As a person, I update my profile and delete my account with all my data.', 'All', 'Must'],
    ],
    [0.8, 6.2, 1.6, 0.9],
    { center: [0, 3] },
  ),
  H2('4.2 Non-Functional Requirements'),
  ...bullets([
    '**Usability:** primary actions reachable in one or two steps; consistent controls; readable text; help where a figure may surprise.',
    '**Accessibility:** keyboard use throughout, visible focus, labelled controls, native dialogs, a skip link, reduced-motion support.',
    '**Security:** hashed passwords, httpOnly session cookie, validation of every request, ownership checks, rate limits.',
    '**Performance:** aggregation on the server, indexes for common queries, lazy loading of pages, caching of public market data.',
    '**Reliability:** honest failure when a source is down; the installed app opens offline with a clear message.',
    '**Maintainability:** shared validation rules between client and server, a feature-based client structure, and automated tests.',
  ]),
  H2('4.3 Hardware and Software Requirements'),
  ...table(
    ['Item', 'Requirement'],
    [
      ['Computer', 'A laptop with at least 8 GB of memory; any modern phone for the installed app'],
      ['Operating system', 'Linux, macOS or Windows (development was on Ubuntu Linux)'],
      ['Runtime', 'Node.js 20 or later with npm'],
      ['Database', 'MongoDB 7, run with Docker Compose (mongo-express on port 8081 for browsing)'],
      ['Browser', 'Google Chrome or any current browser'],
      ['Assistant (optional)', 'A Gemini API key, or Google application default credentials with Vertex AI'],
      ['Tools', 'Git, VS Code, Playwright (end-to-end tests), Vitest (unit tests)'],
    ],
    [2.5, 7.5],
  ),
  H2('4.4 Feasibility'),
  P('Technical feasibility: every component is a widely used open-source tool, and the whole product runs on one laptop. Economic feasibility: there is no licensing cost; Gemini use is optional and billed only when used. Operational feasibility: the product is a website that needs no installation by users, and a phone can install it. Schedule feasibility: the work was split into small releases (Chapter 13) so that a working product existed early.'),
  H2('4.5 User Interface Requirements'),
  P('The interface should group places by purpose, keep the add action visible on every screen, show each figure with its context, give feedback after every action, work at phone width without sideways scrolling, and respect the device\'s light or dark setting and reduced-motion setting.'),
  H2('4.6 Data and Interface Constraints'),
  P('Money is stored as whole paise (integers) and displayed with Indian digit grouping and the rupee sign. Dates are handled in Indian Standard Time. Likes and dislikes are two counts that cannot be negative. Market data is end-of-day only.'),
  H2('4.7 Feasibility Risks'),
  P('The main dependency risks are the availability of the NSE archive and mfapi.in, the Gemini service, and a running MongoDB. Each has a defined behaviour when unavailable: the market screens and Copilot say the data is unavailable, Copilot falls back to the offline engine, and the server reports a clear error.'),
];

// ---------------------------------------------------------------- chapter 5
const ch5 = [
  H1('CHAPTER 5 – SYSTEM ARCHITECTURE AND DESIGN'),
  H2('5.1 Three-Layer Architecture'),
  P('Kosha follows a client, API and database structure. The React client presents screens and gathers input. The Express API validates requests, applies the rules and runs the aggregation queries. MongoDB stores the records. A shared package of validation rules (zod) is used by both the client and the API, so a form and the server agree on what is valid.'),
  ...table(
    ['Layer', 'Main components', 'Responsibility'],
    [
      ['Presentation', 'React 18, React Router, TanStack Query, Tailwind CSS 4, Recharts, react-hook-form', 'Screens, navigation, forms, charts, theme, installable app, API calls and caching'],
      ['Application', 'Node.js, Express 5, zod validation, JWT cookie, Copilot agent, markets service', 'REST endpoints, authentication, ownership checks, business rules, Copilot tools, market data'],
      ['Data', 'MongoDB 7, Mongoose 8', 'Persist users, categories, transactions, budgets, assistant messages, posts, comments, reactions and watchlist items'],
      ['External', 'Google Gemini, NSE archive files, AMFI through mfapi.in', 'Assistant answers, end-of-day stock and index data, mutual fund NAVs'],
    ],
    [1.4, 4.0, 4.6],
  ),
  H2('5.2 Architecture Diagram (Logical)'),
  ...table(
    ['Component flow', 'Description'],
    [
      ['Person with a browser or the installed app', 'Opens the web app at port 5173 in development, or the production build at port 4173.'],
      ['React application and routes', 'Landing, sign in, overview, transactions, analytics, budgets, markets, learn, discussions, Copilot and settings.'],
      ['API client and TanStack Query', 'Calls /api/v1, shares cached results between screens, refreshes after every change.'],
      ['Express API', 'Runs on port 5000; routes for auth, transactions, categories, budgets, balance, analytics, assistant, markets, watchlist, learn and community.'],
      ['Services and aggregation pipelines', 'Business rules and MongoDB aggregation for totals and trends.'],
      ['MongoDB', 'Runs on port 27017 in Docker; nine collections.'],
    ],
    [3.2, 6.8],
  ),
  ...figure('diagram-dfd-level0', 'Level 0 data-flow diagram: Kosha and the people and systems it exchanges data with.', 5.6),
  ...figure('diagram-dfd-level1', 'Level 1 data-flow diagram: the eight main processes and the data stores they read and write.', 6.3),
  P(`The diagrams are also provided as an interactive page (docs/report/diagrams/dfd-and-schema.html) with the Copilot diagram and the database schema. A test in the server suite compares the page with the real models, indexes and routes, so the diagrams stay true to the code.`),
  H2('5.3 Request Processing'),
  ...numbered([
    'The person acts on a screen, for example saving an expense.',
    'The form is validated in the browser with the shared zod rules.',
    'The API client sends a request to /api/v1 with the session cookie.',
    'The authentication middleware reads the cookie, verifies the token and loads the person.',
    'The validation middleware checks the body against the shared schema.',
    'The service applies rules and reads or writes MongoDB, always filtered by the person\'s id.',
    'The API returns JSON; TanStack Query refreshes every figure that depends on the change.',
  ]),
  H2('5.4 Deployment Ports'),
  ...table(
    ['Service', 'Port', 'Notes'],
    [
      ['Web app (Vite dev server)', '5173', 'Proxies /api to the API'],
      ['API (Express)', '5000', 'Also serves nothing but JSON'],
      ['Installable app preview (production build)', '4173', 'Service worker, offline shell'],
      ['MongoDB', '27017', 'Docker container with a named volume'],
      ['mongo-express', '8081', 'Optional database browser'],
    ],
    [4.5, 1.2, 4.3],
    { center: [1] },
  ),
  H2('5.5 Component Responsibilities'),
  P('The client is organised by feature (transactions, budgets, analytics, markets, learn, discussions, assistant, settings, cookies). Shared components (buttons, fields, dialogs, charts, the reader, the navigation) are used by every feature, which keeps the interface consistent. The server is organised as routes, controllers, services, models and middleware. The assistant lives in its own folder with a parser, tools, providers and prompt.'),
  H2('5.6 Architectural Rationale'),
  P('Separating client, API and data lets each change independently. Putting rules in services keeps controllers thin. Sharing the validation package removes a class of mismatch bugs. Keeping market access in one service means the rest of the system never depends on how data is fetched.'),
  H2('5.7 Error and Response Path'),
  P('Errors have one shape: a status, a code and a message. The client turns them into messages next to the field or in a toast. Network failures, an expired session and an unreachable data source each have a specific screen or message.'),
];

// ---------------------------------------------------------------- chapter 6
const ch6 = [
  H1('CHAPTER 6 – PROCESS FLOW, JOURNEYS AND USE CASES'),
  H2('6.1 Registration and Sign-in Flow'),
  ...numbered([
    'A visitor opens the landing page and chooses Create account.',
    'The sign-up form asks for name, email and password; phone and date of birth are optional.',
    'The person must tick the Terms and Privacy Policy box. The API records the accepted version and time.',
    'A cookie banner asks once about optional cookies; the answer is kept in the browser and then with the account.',
    'The server sets an httpOnly session cookie and the overview opens with a getting-started card.',
    'Sign in and sign up share one frame, so the animated skyline carries on between them.',
  ]),
  H2('6.2 Entering a Transaction'),
  P('From any screen the person presses N (or I for income), or presses Add expense. A dialog opens with the amount focused. The person types an amount, picks a category chip, optionally adds a merchant and a note, and presses Save. The list, the overview, the budget bars and the analytics all refresh. Errors appear beside the field that caused them.'),
  H2('6.3 Copilot with Confirmation'),
  ...numbered([
    'The person types "Spent 300 on Uber yesterday, category Transport" in Copilot.',
    'The API sends the message and the tool list to Gemini (or uses the offline engine).',
    'The model asks for the create-transaction tool; the server validates the input and stores a pending action, but writes nothing to the transactions collection.',
    'The reply shows a card with the amount, category and date, and the buttons Confirm and Cancel.',
    'Only on Confirm does the server create the transaction, mark the action confirmed and add the entry to the list as "added by Copilot".',
  ]),
  ...figure('diagram-dfd-level2', 'Level 2 data-flow diagram: inside Copilot. Changes are drafted and kept pending until the person presses Confirm.', 6.3),
  H2('6.4 User Journeys'),
  P('A journey follows one persona through one goal. The steps below are what the product supports today.'),
  ...table(
    ['Persona and goal', 'Steps in Kosha', 'Design response'],
    [
      ['Farah wants to log a cab ride between shifts', 'Open the installed app, tap Add expense (or ask Copilot), type the amount, choose Transport, Save', 'One dialog, amount focused, category chips; dark theme for night use'],
      ['Jasleen wants to protect her home fund', 'Overview shows savings rate; Budgets set limits; a warning appears near the limit', 'A visible savings rate and budget bars with a warning state'],
      ['Karthik wants to know if a thin month is a problem', 'Overview explains the balance; Analytics trend shows income by month; Tax set-aside is its own category', 'Custom categories; trend chart; explained balance'],
      ['Rohit wants to understand a stock page', 'Markets, Stocks, a stock; open the linked guide; ask Copilot what a term means', 'Dated figures; links to guides; Copilot explains and does not advise'],
      ['Mohan wants to see what health costs', 'Analytics by category; filter transactions by Health; export CSV for the doctor', 'Readable tables; filters as chips; export'],
    ],
    [3.0, 4.2, 3.0],
  ),
  H2('6.5 Use Case Summary'),
  ...table(
    ['Use case', 'Actor', 'Result'],
    [
      ['Create an account', 'Visitor', 'Account, consent record, session'],
      ['Record, edit, delete a transaction', 'Member', 'Record saved or changed; figures refresh'],
      ['Set a budget', 'Member', 'Limit stored per category and month; progress shown'],
      ['Set or fix the balance', 'Member', 'Starting balance stored; balance recalculated'],
      ['View analytics', 'Member', 'Charts and tables for the chosen month'],
      ['Ask Copilot', 'Member', 'Answer from own data; draft awaiting Confirm'],
      ['Follow markets', 'Member', 'Dated end-of-day figures; a watchlist'],
      ['Read, comment, react', 'Member', 'Comment saved; like or dislike set (not toggled)'],
      ['Choose cookies', 'Visitor or member', 'Choice stored; follows the account'],
      ['Delete the account', 'Member', 'Account and everything it made removed'],
    ],
    [3.5, 1.8, 4.7],
  ),
  H2('6.6 Copilot Action State Model'),
  P('A pending action moves through four states: **pending** (drafted), **confirming** (the person pressed Confirm and the server is writing), **confirmed** (written) and **cancelled**. The confirming state prevents a double click from creating two records.'),
  H2('6.7 Reaction Rules'),
  P('Each person holds at most one reaction per item. Pressing Like and then Dislike moves the reaction; pressing the same button again changes nothing. Likes and dislikes are counted separately from the stored reactions, so a count can never be negative, and no screen shows a net score.'),
  H2('6.8 Exception Scenarios'),
  ...bullets([
    'An expired session sends the person to sign in; an installed app that is offline says "You\'re offline" instead.',
    'A market source is unreachable: the page and Copilot say so and show no figure.',
    'Gemini is not configured or fails: the offline engine answers and is labelled as such.',
    'A second reaction request at the same instant: the unique index and an upsert make it safe.',
    'A decimal amount, a negative amount or an over-limit amount is refused with a message beside the field.',
  ]),
];

// ---------------------------------------------------------------- chapter 7
const fieldTable = (rows) => table(['Field', 'Type', 'Notes'], rows, [2.0, 1.4, 6.6]);
const ch7 = [
  H1('CHAPTER 7 – DATABASE DESIGN'),
  H2('7.1 Database Overview'),
  P('Kosha stores data in nine MongoDB collections. Every record that belongs to a person carries that person\'s id, and every query is filtered by it. Money is an integer number of paise. The Learn guides are not in the database; they are data files in the server. The interactive schema page lists every field and index and draws the references.'),
  ...table(
    ['Collection', 'Purpose'],
    [
      ['users', 'Accounts, profile, consent, cookie choice, starting balance'],
      ['categories', 'Default and custom categories, per person'],
      ['transactions', 'Income and expenses'],
      ['budgets', 'One monthly limit per category'],
      ['assistantmessages', 'The Copilot conversation and pending actions'],
      ['posts, comments, reactions', 'Discussions, comments on posts and guides, likes and dislikes'],
      ['watchlistitems', 'Stocks, indices and funds a person follows'],
    ],
    [3, 7],
  ),
  H2('7.2 User Document (users)'),
  ...fieldTable([
    ['name, email', 'String', 'Name up to 60 characters; email lower-cased and unique'],
    ['passwordHash', 'String', 'bcrypt hash; never sent to the browser'],
    ['phone, dateOfBirth', 'String', 'Optional; phone stored in E.164; minimum age 13'],
    ['avatar', 'Object', 'An icon and colour, or a small photo as a data URL'],
    ['consent', 'Object', 'termsVersion and acceptedAt'],
    ['cookieConsent', 'Object', 'preferences (yes/no), version, decidedAt'],
    ['openingBalance', 'Number', 'Paise the person already had; may be negative'],
  ]),
  H2('7.3 Transaction Document (transactions)'),
  ...fieldTable([
    ['user, category', 'ObjectId', 'References to users and categories'],
    ['type', 'String', 'income or expense'],
    ['amount', 'Number', 'Integer paise, at least 1, with an upper limit'],
    ['description, merchant, notes', 'String', '120, 60 and 500 characters at most'],
    ['date', 'Date', 'The day it happened'],
    ['paymentMethod', 'String', 'UPI, Card, Cash, Bank or Wallet'],
    ['source', 'String', 'manual, or copilot when confirmed from a draft'],
  ]),
  H2('7.4 Other Collections'),
  ...table(
    ['Collection', 'Fields', 'Indexes'],
    [
      ['categories', 'user, name, type, color, icon, isDefault', 'Unique on user, type and name (ignoring case)'],
      ['budgets', 'user, category, month (YYYY-MM), limit (paise)', 'Unique on user, month, category'],
      ['assistantmessages', 'user, role, content, provider, toolCalls, data, pendingAction', 'user and createdAt'],
      ['posts', 'author, space, title, body, likes, dislikes, score', 'author; space and date; date; score and date'],
      ['comments', 'author, kind (article or post), target, body, likes, dislikes, score', 'author; kind, target and date'],
      ['reactions', 'user, kind, target, value (like or dislike)', 'Unique on user, kind and target'],
      ['watchlistitems', 'user, kind, ref, label', 'Unique on user, kind and ref'],
    ],
    [2.0, 5.0, 3.0],
  ),
  H2('7.5 Relationships'),
  P('Categories, transactions, budgets, assistant messages, posts, comments, reactions and watchlist items each point to one user. Transactions and budgets also point to one category. A comment or a reaction points to a post, a comment or a guide by id or slug; because guides are not in the database this is a soft reference.'),
  H2('7.6 Data Integrity Rules'),
  ...bullets([
    'A person cannot have two categories with the same name and type, nor two budgets for one category and month.',
    'A person holds at most one reaction per item (a unique index).',
    'Amounts must be whole paise and within a limit; budgets likewise.',
    'Deleting an account removes the person\'s money data, messages, watchlist, posts, comments and reactions, and refreshes the counts their reactions touched.',
  ]),
  H2('7.7 Derived Values'),
  P('The balance is the starting balance plus all income minus all expenses. The savings rate is income minus spending as a share of income. Post and comment like counts are recomputed from the reactions and stored only so that "Most liked" can be a database sort.'),
  H2('7.8 Database Improvements'),
  P('Possible improvements are a text index for search, recurring transactions, and a separate collection for guides if they ever need editing from the interface.'),
];

// ---------------------------------------------------------------- chapter 8
const ch8 = [
  H1('CHAPTER 8 – TECHNOLOGY STACK AND METHODOLOGY'),
  H2('8.1 Frontend Technologies'),
  ...table(
    ['Technology', 'Version', 'Purpose'],
    [
      ['React', '18.3', 'Component-based interface'],
      ['Vite', '6', 'Development server and production build'],
      ['Tailwind CSS', '4', 'Utility styling with design tokens for two themes'],
      ['React Router', '6', 'Navigation and nested routes (articles and posts open over their list)'],
      ['TanStack Query', '5', 'Server state, caching and refresh after changes'],
      ['react-hook-form and zod', '7 and 3', 'Forms and shared validation'],
      ['Recharts', '3', 'Charts'],
      ['lucide-react', '1', 'Icons'],
      ['Service worker and web manifest', '–', 'Installable app and offline shell'],
    ],
    [3.2, 1.2, 5.6],
    { center: [1] },
  ),
  H2('8.2 Backend Technologies'),
  ...table(
    ['Technology', 'Version', 'Purpose'],
    [
      ['Node.js', '20 or later', 'Runtime'],
      ['Express', '5', 'REST API'],
      ['Mongoose', '8', 'Models, validation and queries'],
      ['MongoDB', '7', 'Database (Docker)'],
      ['jsonwebtoken and bcryptjs', '9 and 3', 'Session token and password hashing'],
      ['helmet, cors, express-rate-limit, cookie-parser', '–', 'Headers, origin control, rate limits, cookies'],
      ['@google/genai', '1', 'Gemini API and Vertex AI client'],
    ],
    [3.2, 1.2, 5.6],
    { center: [1] },
  ),
  H2('8.3 Quality Tools'),
  ...table(
    ['Tool', 'Use'],
    [
      ['Vitest', 'Unit and integration tests for the shared package, the server and the client'],
      ['React Testing Library, jsdom', 'Component tests'],
      ['Supertest', 'API tests against a separate test database'],
      ['Playwright with Google Chrome', 'End-to-end tests of the real app, including phone layouts and the installed app'],
      ['Git and GitHub', 'History, with a failing test committed before the fix'],
    ],
    [3, 7],
  ),
  H2('8.4 Development Methodology'),
  P(`The team worked in small increments with test-driven development. For each change a failing test was committed first, marked (red) in the commit message, and the implementation followed in a second commit marked (green). The repository has ${COMMITS} commits, ${RED} of them red commits. Work was pushed to the main branch in small steps, so the history shows the order of decisions.`),
  H2('8.5 Product Management Approach'),
  ...bullets([
    '**Vision:** a calm place where a person sees where money went, understands why and decides what next.',
    '**Backlog and priorities:** user stories written for personas and ranked Must, Should, Could (Chapter 4).',
    '**MVP:** accounts, transactions, overview, budgets. Later releases add analytics, Copilot, installable app, markets, learning and discussion, then privacy controls and polish (Chapter 13).',
    '**Definition of done:** the feature works end to end, has tests at the right level, is checked on a phone width and in both themes, and is documented.',
    '**Review:** an independent review of the work found real defects, each fixed test-first (Chapter 12).',
  ]),
  H2('8.6 Why React'),
  P('React\'s components suit a product made of repeated patterns (cards, dialogs, tables, charts). Combined with TanStack Query it keeps every figure consistent after a change without manual refreshing, which is central to the experience.'),
  H2('8.7 Why Express and MongoDB'),
  P('Express keeps the API small and explicit. MongoDB\'s aggregation pipeline fits the analytics (totals, trends, weekdays, merchants) and its documents fit records that carry variable fields, such as a Copilot message with a pending action.'),
  H2('8.8 Why Gemini, With an Honest Fallback'),
  P('Gemini provides natural-language understanding and function calling. The server is also able to answer common questions without it. The interface always shows which engine produced a reply, and the offline engine is described as what it is: rule-based.'),
];

// ---------------------------------------------------------------- chapter 9
const ch9 = [
  H1('CHAPTER 9 – FRONTEND IMPLEMENTATION AND UI/UX DESIGN'),
  H2('9.1 Information Architecture'),
  P('The navigation is grouped by what a person is doing, not by technical area. On a laptop it is a sidebar; on a phone it is a bottom tab bar with four everyday places and a More sheet for the rest, each place in its own colour.'),
  ...table(
    ['Group', 'Places'],
    [
      ['Money', 'Overview, Transactions, Analytics, Budgets'],
      ['Invest', 'Markets, Stocks, Mutual funds, Watchlist'],
      ['Learn and talk', 'Learn, Discussions'],
      ['Assistant', 'Copilot'],
      ['Account', 'Settings (profile, preferences, categories, privacy and cookies)'],
    ],
    [3, 7],
  ),
  H2('9.2 Design System'),
  ...table(
    ['Element', 'Decision'],
    [
      ['Colour', 'A deep indigo brand colour, an amber accent, tokens for paper, ink and lines; the same names are redefined for the dark theme'],
      ['Type', 'Anek Latin; wide display weights for headings, regular weights for text'],
      ['Logo', 'One fixed drawing on a black tile, identical in light and dark themes, in the tab icon and on the home-screen icon'],
      ['Backdrop', 'A still ink drawing of Indian city skylines behind the app; animated on the landing and sign-in pages'],
      ['Components', 'Shared buttons, fields, dialogs, switches, tabs and charts, so every screen behaves the same'],
      ['Motion', 'Short, purposeful transitions; everything stops for people who ask for reduced motion'],
      ['Icons', 'One icon set; coloured icons on phones to tell places apart'],
    ],
    [2.2, 7.8],
  ),
  H2('9.3 Overview (Dashboard)'),
  P('The overview opens with a greeting and the month. The balance card shows the figure and says how it is made up. "What stands out this month" lists up to a few observations such as the savings rate or an over-budget category. Four key figures follow (income, spent, saved, savings rate), each with a help tip and a comparison with the same days last month. A getting-started card guides a new person through four steps.'),
  ...figure('dashboard', 'The overview for a sample account: balance, observations and key figures.'),
  H2('9.4 Transactions'),
  P('The transactions screen has search, filter chips, a month picker, a list grouped by day, a spending calendar and CSV export. The entry dialog opens with the amount focused and category chips with icons and colours. Validation messages appear beside the field.'),
  ...figure('transactions', 'The transactions list with filters and the month picker.'),
  ...figure('add-transaction', 'The entry dialog: amount, category chips, merchant and note.', 5.0),
  H2('9.5 Budgets and Analytics'),
  P('Budgets show a bar per category with the amount spent against the limit and a warning state as the limit approaches. Analytics answer questions: how spending and income trend over twelve months, where the month went by category, which weekdays are heaviest and which merchants take the most. Hovering a bar highlights only the bar.'),
  ...figure('budgets', 'Budgets: a limit per category with progress bars.'),
  ...figure('analytics', 'Analytics: trend, categories, weekdays and merchants.'),
  H2('9.6 Kosha Copilot'),
  P('Copilot opens as a page and as a drawer on any screen. It shows which engine answered, a "What you can ask" panel, and cards for drafted changes with Confirm and Cancel. It explains market data and learning guides, and declines to say what to buy or sell.'),
  ...figure('copilot', 'Copilot answering a question about the person\'s own data.'),
  H2('9.7 Markets, Learn and Discussions'),
  P('Markets shows indices, sectors and movers with the trading day and the source; stock and fund pages show returns and a chart, with a table view. Learn lists guides by topic and opens one over a blurred page, with takeaways, sources and an Ask Copilot button. Discussions has spaces by topic, posts, comments and separate like and dislike counts.'),
  ...figure('markets', 'Markets: end-of-day indices, sectors and movers with their date.'),
  ...figure('article', 'A Learn guide opened over the page.'),
  ...figure('discussions', 'Discussions: posts by topic with separate like and dislike counts.'),
  H2('9.8 Landing, Sign-in and Sign-up'),
  P('Visitors see a landing page with an animated ink skyline of six Indian cities. Sign in and sign up share one frame so the drawing keeps running when the person switches. The note about data sits quietly under the form.'),
  ...figure('landing', 'The landing page.'),
  H2('9.9 Phone Experience and the Installed App'),
  P('On a phone the sidebar becomes a bottom tab bar and a More sheet. The sheet shows every place as a coloured icon in a four-column grid, keeps its title in view while scrolling, and closes with the Back button. The app can be installed, opens offline with a clear message, and has shortcuts for adding an entry.'),
  ...figure('mobile-more', 'The More sheet on a phone.', 2.6),
  ...figure('mobile-dashboard', 'The overview on a phone.', 2.6),
  H2('9.10 Themes'),
  ...figure('dashboard-dark', 'The overview in the dark theme.'),
  H2('9.11 Navigation, Feedback and Forms'),
  ...bullets([
    'Keyboard shortcuts: N and I add entries, / searches, ? lists shortcuts, Esc closes dialogs.',
    'A "Back to top" button appears on long pages.',
    'Toasts confirm actions; skeletons show loading; an offline banner shows lost connection.',
    'Forms validate with the same rules as the server and show messages beside the field.',
  ]),
  H2('9.12 Accessibility and Responsiveness'),
  P('Dialogs use the native dialog element, so focus is trapped and returns to where it was. Controls have accessible names, focus is clearly visible, a skip link jumps to the content, reduced motion is respected, and no screen scrolls sideways at phone width. A formal audit against WCAG with an external tool has not been carried out; accessibility here means the practices above, which are covered by tests.'),
];

// ---------------------------------------------------------------- chapter 10
const ch10 = [
  H1('CHAPTER 10 – BACKEND IMPLEMENTATION AND API DESIGN'),
  H2('10.1 Application Structure'),
  P('The server is divided into routes (URL and middleware), controllers (HTTP details), services (rules and queries), models (Mongoose schemas), middleware (authentication, validation, errors), the agent (Copilot) and the markets module. All routes live under /api/v1; everything except the auth routes needs a session.'),
  H2('10.2 REST API Endpoints'),
  ...table(
    ['Area', 'Endpoints'],
    [
      ['Auth', 'POST /auth/register, /auth/login, /auth/logout; GET, PATCH, DELETE /auth/me; PUT /auth/me/cookies; POST /auth/change-password'],
      ['Transactions', 'GET, POST /transactions; GET /transactions/export.csv; GET, PATCH, DELETE /transactions/:id'],
      ['Categories', 'GET, POST /categories; PATCH, DELETE /categories/:id'],
      ['Budgets', 'GET, PUT /budgets; POST /budgets/copy; DELETE /budgets/:id'],
      ['Balance', 'GET, PUT /balance; GET /balance/banks; POST /balance/bank-demo'],
      ['Analytics', 'GET /analytics/summary, by-category, trend, daily, weekday, merchants, category-trend'],
      ['Assistant', 'GET /assistant/status, insights, history; POST /assistant/message; POST /assistant/actions/:id/confirm and cancel; DELETE /assistant/history'],
      ['Markets', 'GET /markets/overview, indices/:name, stocks/nifty50, stocks/search, stocks/:symbol, funds/categories, funds/search, funds/top, funds/:code'],
      ['Watchlist', 'GET, POST /watchlist; DELETE /watchlist/:id'],
      ['Learn', 'GET /learn/articles, /learn/articles/:slug'],
      ['Community', 'GET, POST /community/posts; GET, DELETE /community/posts/:id; GET, POST /community/comments; DELETE /community/comments/:id; PUT /community/reactions'],
    ],
    [1.6, 8.4],
  ),
  H2('10.3 Registration and Login'),
  P('Registration validates the body, refuses an unaccepted Terms box, hashes the password with bcrypt, creates the person and the default categories, records the accepted policy version, and sets an httpOnly session cookie. Login checks the password and sets the cookie. Sign-in attempts are rate limited.'),
  H2('10.4 Transaction and Budget Operations'),
  P('Every operation filters by the signed-in person. Listing supports search, type, category, date range, sort and paging. Budgets are upserted by category and month, and a month\'s budgets can be copied forward. The balance is computed from the starting balance and the totals.'),
  H2('10.5 Copilot Operations'),
  P('The message endpoint is rate limited. The agent sends the conversation and a list of tools to Gemini; the tools (summary, breakdown, comparison, search, budgets, drafting, market data, learning guides) run on the server against the signed-in person\'s data. Drafting tools create pending actions; confirm and cancel endpoints resolve them.'),
  H2('10.6 Response and Error Handling'),
  P('Errors use one shape with a status, a code and a message, and validation errors list the offending fields. Unknown routes and unexpected exceptions are handled in one place, so the client always receives JSON.'),
  H2('10.7 API Contract Considerations'),
  P('Validation schemas are shared with the client. List endpoints return a total and page information. Money is always an integer in paise. Dates are ISO strings; the server interprets days in Indian Standard Time.'),
  H2('10.8 Operational Configuration'),
  P('Configuration comes from environment variables read at start-up: the MongoDB address, the token secret, the allowed origin, and the Gemini settings (an API key, or application default credentials and a project and region). A separate database is used for tests. The environment file is not committed.'),
];

// ---------------------------------------------------------------- chapter 11
const ch11 = [
  H1('CHAPTER 11 – SECURITY AND VALIDATION'),
  H2('11.1 Authentication'),
  P('After sign-in the server issues a signed token in an httpOnly, SameSite cookie, so scripts on the page cannot read it. The authentication middleware verifies it on every protected request and loads the person.'),
  H2('11.2 Authorization and Ownership'),
  P('Every query includes the person\'s id. A person can read and change only their own records, and can delete only their own posts and comments. A record that belongs to someone else is reported as not found.'),
  H2('11.3 Password Protection'),
  P('Passwords are hashed with bcrypt and never stored or returned. Changing the password or deleting the account asks for the current password.'),
  H2('11.4 Input and Business Validation'),
  ...bullets([
    'The shared zod schemas validate every body, query and parameter; unknown fields are rejected on strict schemas.',
    'Amounts must be whole paise within a limit; text has length limits; invisible and control characters are stripped from posts.',
    'Ids are validated and written one way, so a differently written id cannot bypass a rule.',
    'Posting, commenting, reacting and Copilot messages are rate limited.',
  ]),
  H2('11.5 Privacy, Consent and Cookies'),
  P('Sign-up records which version of the Terms and Privacy Policy was accepted. Kosha sets one cookie, the sign-in cookie. A banner asks once about optional storage (theme and a hidden card), with equal choices. The answer is kept in the browser and with the account (newest answer wins), Settings lists everything that is stored, and a "no" removes the optional items. There are no advertising, analytics or tracking cookies.'),
  H2('11.6 Threats and Mitigations'),
  ...table(
    ['Threat', 'Mitigation'],
    [
      ['Password guessing', 'bcrypt; rate limit on sign-in attempts'],
      ['Reading another person\'s data', 'Ownership filter on every query; tests for it'],
      ['Script access to the session', 'httpOnly cookie'],
      ['Malformed or hostile input', 'Shared schemas, strict bodies, limits, stripped control characters'],
      ['Spam in discussions', 'Rate limits; one reaction per person per item'],
      ['The assistant being used to change data silently', 'Drafts only; changes need Confirm; actions are per person'],
      ['Market advice being implied', 'Copilot instructed not to advise; pages state end-of-day and "not advice"'],
    ],
    [3.5, 6.5],
  ),
  H2('11.7 Deployment Considerations'),
  P('A deployment would need HTTPS, a strong secret, a restricted origin, a managed MongoDB with backups and monitoring. These are listed as limitations because the project runs locally.'),
];

// ---------------------------------------------------------------- chapter 12
const ch12 = [
  H1('CHAPTER 12 – TESTING STRATEGY, TEST CASES AND USABILITY REVIEW'),
  H2('12.1 Testing Approach'),
  P('Tests run at four levels. The shared package tests the rules both sides use. The server tests cover units (parsers, the market service, Copilot tools, content) and API integration against a real MongoDB test database. The client tests cover components and screens with simulated users. End-to-end tests drive the real app in Chrome against the real server, including a phone viewport and the installed app.'),
  ...table(
    ['Suite', 'Tests', 'What it covers'],
    [
      ['Shared', String(T.shared), 'Money, dates, validation schemas, community and cookie rules'],
      ['Server', String(T.server), 'Unit and API integration tests'],
      ['Client', String(T.client), 'Components, screens, hooks, service worker'],
      ['End-to-end', String(T.e2e), 'Real browser journeys, phone layouts, installed app'],
      ['Total', String(TOTAL_TESTS), 'All pass at the time of writing'],
    ],
    [2.4, 1.3, 6.3],
    { center: [1], boldFirst: true },
  ),
  H2('12.2 Test Cases'),
  P('The cases below are a selection that map to the requirements. Each is automated; "Result" is the outcome of the last full run.'),
  ...table(
    ['ID', 'Test case', 'Expected result', 'Result'],
    [
      ['TC-01', 'Register with the Terms accepted', 'Account created; accepted version and time recorded', 'Pass'],
      ['TC-02', 'Register without accepting the Terms', 'Refused with a message beside the box', 'Pass'],
      ['TC-03', 'Sign in with a wrong password', 'Refused; no session', 'Pass'],
      ['TC-04', 'Add a valid expense', 'Saved; list, overview and budgets refresh', 'Pass'],
      ['TC-05', 'Add an amount with decimals of a paisa', 'Refused with a validation message', 'Pass'],
      ['TC-06', 'Balance below zero', 'Explained, with a way to fix it', 'Pass'],
      ['TC-07', 'Spend near a budget limit', 'A warning appears', 'Pass'],
      ['TC-08', 'Ask Copilot to log an expense', 'Draft shown; saved only after Confirm', 'Pass'],
      ['TC-09', 'Ask Copilot what to buy', 'Declines and points to the SEBI guidance', 'Pass'],
      ['TC-10', 'Like, then dislike, then repeat', 'Reaction moves, never toggles; counts never negative', 'Pass'],
      ['TC-11', 'Market source unreachable', '503 and a message; no invented figure', 'Pass'],
      ['TC-12', 'Cookie choice on one device', 'Kept with the account; a second device does not ask again', 'Pass'],
      ['TC-13', 'Every page at 390 px', 'Nothing scrolls sideways', 'Pass'],
      ['TC-14', 'Delete the account', 'Account and its posts are gone', 'Pass'],
    ],
    [0.9, 3.0, 4.6, 0.9],
    { center: [0, 3] },
  ),
  H2('12.3 Usability Review Against Nielsen\'s Heuristics'),
  P('The team reviewed the product against Nielsen\'s ten heuristics. This is an expert review by the team, not a study with participants. It lists what the product does and where the evidence is.'),
  ...table(
    ['Heuristic', 'How Kosha addresses it'],
    [
      ['1. Visibility of system status', 'Toasts after actions, skeletons while loading, budget progress bars, an offline banner, the engine label on Copilot replies'],
      ['2. Match with the real world', 'Rupee amounts with Indian grouping, IST dates, categories such as UPI, rent and EMI, plain words'],
      ['3. User control and freedom', 'Escape closes dialogs; Confirm and Cancel for Copilot drafts; Back closes the More sheet'],
      ['4. Consistency and standards', 'Shared components and design tokens; the same action keeps the same name everywhere'],
      ['5. Error prevention', 'Shared validation, amount limits, password for deletion, drafts that are not saved until Confirm'],
      ['6. Recognition over recall', 'Category chips with icons, filters as chips, a month picker, coloured navigation icons'],
      ['7. Flexibility and efficiency', 'N, I, / and ? shortcuts; quick add on every screen; installed-app shortcuts; CSV export'],
      ['8. Minimalist design', 'A grouped sidebar, a faint still backdrop, one primary action per screen'],
      ['9. Help with errors', 'Messages beside fields, an explained negative balance, honest messages when data is unavailable'],
      ['10. Help and documentation', 'Help tips on key figures, "What you can ask" in Copilot, the shortcuts list, Learn guides, the privacy policy'],
    ],
    [3.0, 7.0],
  ),
  H2('12.4 Defects Found by Independent Review'),
  P('After the features were complete, a separate reviewer audited the work for security, correctness, accessibility and the installed app. It found no security hole, but it found defects. Each became a failing test first and was then fixed.'),
  ...table(
    ['Defect', 'Fix'],
    [
      ['A reaction rule could be bypassed with an id written in upper case', 'Ids written one way; test added'],
      ['Search returned the wrong company', 'Ranking corrected; test added'],
      ['Links were hidden by the sidebar at laptop heights', 'The sidebar scrolls as one piece; tests at three heights'],
      ['A crash after an update', 'A guarded reload with an explanation'],
      ['Market data did not reach an offline user', 'Public figures cached by the service worker; personal data never cached'],
      ['Shortcuts fired inside dialogs', 'Shortcuts disabled while a dialog is open'],
      ['Caches could grow without limit', 'Capped caches'],
    ],
    [5.5, 4.5],
  ),
  H2('12.5 Boundary and Negative Testing'),
  P('Tests cover amounts at the limits, empty and over-long text, invalid ids, requests for another person\'s records, duplicate categories and budgets, simultaneous reactions, unreachable data sources, expired sessions, and offline reloads.'),
  H2('12.6 What Was Not Tested'),
  P('There was no usability study with real participants, no formal WCAG audit and no load testing. These are listed under limitations and future work.'),
];

// ---------------------------------------------------------------- chapter 13
const ch13 = [
  H1('CHAPTER 13 – RESULTS, LIMITATIONS AND FUTURE ENHANCEMENTS'),
  H2('13.1 Results and Current Status'),
  ...bullets([
    'A working full-stack product with accounts, transactions, budgets, balance, analytics, markets, a watchlist, Learn, Discussions, Copilot, settings and privacy controls.',
    `The source is about ${SOURCE_LINES.toLocaleString('en-IN')} lines (without tests) in ${COMMITS} commits, in the repository ${REPO}.`,
    `${TOTAL_TESTS.toLocaleString('en-IN')} automated tests pass across four levels.`,
    'Sixteen made-up community members and eight sample accounts give the product realistic data for demonstration.',
    'An interactive page of data-flow diagrams and the database schema, checked against the code by a test.',
  ]),
  H2('13.2 Release Plan'),
  ...table(
    ['Release', 'Contents', 'Priority'],
    [
      ['1 (MVP)', 'Accounts and consent, transactions, categories, overview, budgets, balance', 'Must'],
      ['2', 'Analytics, spending calendar, CSV export, Copilot with confirmation, installable app', 'Should'],
      ['3', 'Markets and watchlist, Learn guides, Discussions with separate reactions', 'Could'],
      ['4', 'Phone navigation, themes and design polish, cookie choice synced to the account, sample accounts, diagrams', 'Should'],
    ],
    [1.4, 7.0, 1.6],
    { center: [0, 2] },
  ),
  H2('13.3 Proposed Product Measures'),
  P('These measures were not collected, because the product has not been released to users. They are the measures the team would track.'),
  ...table(
    ['Measure', 'What it tells us'],
    [
      ['Time to first saved entry', 'Whether the first action is obvious'],
      ['Entries per active person per week', 'Whether recording is easy enough to keep up'],
      ['Share of people who set a budget', 'Whether budgets are discoverable and useful'],
      ['Copilot drafts confirmed against cancelled', 'Whether drafts match what people meant'],
      ['Seven-day and thirty-day return', 'Whether the product is worth coming back to'],
    ],
    [4, 6],
  ),
  H2('13.4 Current Limitations'),
  ...bullets([
    'No automatic import from banks or SMS; every record is typed in.',
    'Market data is end-of-day and limited to the sources that allow programmatic access; BSE indices are not shown.',
    'The product has not been deployed publicly, and has not had a usability study with participants or a formal accessibility audit.',
    'Gemini answers depend on a configured key or credentials; otherwise the offline engine, which handles common questions only, is used.',
    'The personas are proto-personas written by the team, not derived from interviews.',
  ]),
  H2('13.5 Future Enhancements'),
  ...bullets([
    'Run a usability test with real participants for each persona and revise the design from what is observed.',
    'Recurring transactions and reminders; bill-due notifications.',
    'Import of bank statements (CSV or PDF) with a review step.',
    'A formal accessibility audit and fixes.',
    'Deployment with HTTPS, backups and monitoring.',
    'Regional languages for the interface and Copilot.',
  ]),
  H2('13.6 Evaluation of Objectives'),
  ...table(
    ['Objective', 'Status'],
    [
      ['Fast entry from any screen', 'Met: button, N and I keys, phone tab bar'],
      ['Explained figures', 'Met: balance explainer, help tips, Copilot'],
      ['Budgets with warnings', 'Met'],
      ['Analytics that answer questions', 'Met'],
      ['Honest market data', 'Met: end-of-day, dated, 503 when unavailable'],
      ['Assistant with confirmation and no advice', 'Met'],
      ['Learning and discussion with sound counts', 'Met'],
      ['Phone, themes and privacy choices', 'Met; formal audit still to do'],
    ],
    [5, 5],
  ),
];

// ---------------------------------------------------------------- chapter 14
const RUBRIC = [
  ['Problem Identification and Objectives (10)', 'Problem statement, personas, objectives, scope and relevance (Ch. 1–3).', 'Explain the problem and show how several personas are served.'],
  ['System Design and Methodology (10)', 'Requirements, architecture, flows, database, technology and product method (Ch. 4–8).', 'Show the data-flow diagrams, the schema page and the user stories.'],
  ['Implementation and Functionality (15)', 'Frontend and UI/UX design, backend and API, security (Ch. 9–11).', 'Live demonstration of the core journeys on a laptop and a phone.'],
  ['Testing and Results (5)', 'Test plan, cases, usability review, defects, results and limits (Ch. 12–13).', 'Show the test results and the heuristic review.'],
  ['Documentation and Presentation (10)', 'Structured report, references, presentation guidance (Ch. 14).', 'Present clearly and answer design and product questions.'],
];
const ch14 = [
  H1('CHAPTER 14 – CONCLUSION, REFERENCES AND RUBRIC MAPPING'),
  H2('14.1 Conclusion'),
  P('Kosha shows how design and product decisions shape a financial tool: start from people, make the first action obvious, explain every number, ask before changing anything, and be honest about what is not known. The product is a complete, working full-stack application, and the report records the process behind it: personas, stories and priorities, flows, a design system, a release plan, a usability review and test evidence.'),
  P('The main lessons were that small, consistent interface rules matter more than the number of features, that tests written first keep a growing product honest, and that product questions (what to build first, what to leave out) are as important as technical ones.'),
  H2('14.2 Mapping to MCA Evaluation Rubrics'),
  ...table(['Rubric criterion', 'What this report documents', 'Evidence to present at evaluation'], RUBRIC, [2.6, 4.0, 3.4]),
  H2('14.3 References'),
  ...bullets([
    'Project repository: Kosha, source code and history. ' + REPO,
    'Rubrics for LA Project, Department of Master of Computer Applications – MCA, Academic Year 2026–27.',
    'Nielsen, J. 10 Usability Heuristics for User Interface Design. Nielsen Norman Group.',
    'Cooper, A. About Face: The Essentials of Interaction Design (personas and goal-directed design).',
    'React documentation: https://react.dev/',
    'Express documentation: https://expressjs.com/',
    'MongoDB documentation: https://www.mongodb.com/docs/',
    'Mongoose documentation: https://mongoosejs.com/docs/',
    'Tailwind CSS documentation: https://tailwindcss.com/docs',
    'TanStack Query documentation: https://tanstack.com/query/latest',
    'Google Gemini API documentation: https://ai.google.dev/gemini-api/docs',
    'NSE India archives: https://nsearchives.nseindia.com/ and mfapi.in for AMFI mutual fund data.',
    'Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/',
    'Playwright and Vitest documentation: https://playwright.dev/ and https://vitest.dev/',
  ]),
  H2('14.4 Final Submission Checklist'),
  ...bullets([
    'Confirm the member names, USNs and the division of work with every member.',
    'Run the application and the complete journeys for at least two personas, on a laptop and a phone.',
    'Run all four test suites and keep the output.',
    'Open the data-flow and schema page and be ready to explain one flow end to end.',
    'Replace the development secret and set the Gemini credentials before any deployment.',
    'Add screenshots to the presentation for the overview, entry dialog, budgets, Copilot confirmation and the phone layout.',
  ]),
];

// ---------------------------------------------------------------- document
const children = [...cover, ...team, ...abstract, ...contents, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...ch9, ...ch10, ...ch11, ...ch12, ...ch13, ...ch14];

const border = { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 18 };
const doc = new Document({
  creator: 'Kosha project team',
  title: 'Kosha – Personal Finance Tracker: LA Project Report (25MCA313)',
  description: 'UI/UX Design & Product Management LA project report',
  styles: { default: { document: { run: { font: FONT, size: BODY } } } },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1037, right: 1080, bottom: 1037, left: 1224, header: 504, footer: 504 },
          borders: {
            pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE, zOrder: PageBorderZOrder.FRONT },
            pageBorderTop: border,
            pageBorderRight: border,
            pageBorderBottom: border,
            pageBorderLeft: border,
          },
        },
      },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('DEPARTMENT OF MASTER OF COMPUTER APPLICATIONS (MCA)  |  LA PROJECT REPORT', { size: 18, color: GREY })] })] }) },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Kosha – Personal Finance Tracker  •  Course 25MCA313  •  Page ', { size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: GREY })] })],
        }),
      },
      children,
    },
  ],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`Wrote ${path.relative(ROOT, OUT)} (${figureNo} figures)`);

// ---------------------------------------------------------------- optional: measure the chapter pages with LibreOffice
if (process.argv.includes('--pages')) {
  const outDir = path.join(TMP, 'uiux-pdf');
  fs.mkdirSync(outDir, { recursive: true });
  execSync(`soffice --headless --convert-to pdf --outdir "${outDir}" "${OUT}"`, { stdio: 'ignore' });
  const pdf = path.join(outDir, 'Kosha_UIUX_LA_Project_Report.pdf');
  const count = Number(/Pages:\s+(\d+)/.exec(execSync(`pdfinfo "${pdf}"`).toString())[1]);
  const found = {};
  for (let p = 1; p <= count; p += 1) {
    const text = execSync(`pdftotext -f ${p} -l ${p} -layout "${pdf}" -`).toString();
    for (const [n] of CHAPTERS) if (!found[n] && new RegExp(`^\\s*CHAPTER ${n} –`, 'm').test(text)) found[n] = p;
  }
  fs.writeFileSync(PAGES_FILE, JSON.stringify(found, null, 2));
  console.log(`Chapter pages: ${JSON.stringify(found)} of ${count}. Run again without --pages to write them into the contents.`);
}

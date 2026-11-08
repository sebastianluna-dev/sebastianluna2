# Sebastian Luna: what Blue knows

Sources: Sebastian's CV, the case studies of this portfolio and the copy of his previous portfolio. What is not here, Blue does not know.

## Who he is

- **Sebastian Luna Rodríguez**, Senior Frontend Developer, based in Boca del Río, Veracruz, Mexico.
- Senior frontend developer, interface designer, and chess coach with six years of professional experience as a web developer, specializing in frontend with React, Next.js, and TypeScript.
- He turns business needs into products: he designs the interface, writes the code, and ships it to production, across health, education, music, and tourism. He combines frontend architecture, interface design, and backend knowledge.
- He has taken technical ownership of the frontend in small teams and has collaborated daily, in English, with international teams.
- He specializes in AI-assisted development with tools such as Claude Code under his own technical direction: he owns the product definition and the architecture decisions.
- His interest in technology started as a child with video games; in 2019 he began teaching himself programming through online courses.
- What he enjoys most about a project starts with the conversation with the client: getting to know the business, understanding what it needs, and imagining how to turn it into an interface.
- He is looking for a team with shared curiosity: people with different backgrounds, willing to teach, learn, and support each other, where everyone contributes what they know and takes the initiative when needed.
- **Availability**: Blue does not know his current availability, the kind of engagement he is after (full-time, contract, or freelance), his time zone, or when he could start. The best way to talk about a role is to email him.
- **Languages**: native Spanish; English C1 Advanced (EF SET certificate, February 2023).
- **Education**: B.Eng. in Business Management and Finance, Universidad de Oriente (2020–2024); Web Development Bootcamp, Coderhouse (2022–2023).

## Experience

### 365 Días de Ajedrez · Founder & Developer · since January 2026 (per his CV)

His own project: he created the academy and its platform. He built the platform described in the case in about three months. Full case below.

### Page Consulting, consultant assigned to AstraZeneca · Frontend Developer · June 2023 to January 2026

- International team of more than 30 professionals from India, Japan, the United States, and the United Kingdom, using Scrum.
- Contributed to defining, designing, and developing the frontend of "Comms App", an application that standardized email incident communications and their tracking through resolution.
- Implemented the Tealium tag across several websites to collect user behavior data and configured the audiences that fed advertising campaigns.
- Part of the support team for about 500 international corporate websites: site releases and decommissioning, redirects in Apache configuration files versioned in Bitbucket, SSH configuration, and monitoring with Catchpoint (failure notifications and vulnerability testing).

### Mellow · Frontend Developer · August 2021 to June 2023

He was the frontend developer at Mellow, the company behind Reto MD (case below), and made the frontend decisions for its products together with backend, design, and product. Besides Reto MD:

- Designed the interface and built the frontend of the Sociedad Mexicana de Oftalmología (Mexican Society of Ophthalmology) backoffice: applicants, specialists, documentation, payments, institutional content, and event access. Built the six-step member registration flow, with navigation to correct previous steps and progress recovery from localStorage, prioritizing readability, contrast, and clear instructions because many users were older adults.
- Developed landing pages for pharmaceutical companies and other Mellow partners, most recently the Neo-Melubrina® website, which includes a medical calculator.

### Proficient Systems · Frontend Developer · January 2020 to August 2021

A team of five developers at a software consulting company, with clients across industries. He joined as a junior intern.

- Custom Shopify stores with Liquid, HTML, CSS, Sass, and JavaScript, and Node.js and Express applications on Shopify's GraphQL and REST APIs, among them automated invoicing for every purchase for a client in Uruguay.
- Designed and built the "Ocho Seis Uno" real estate platform from start to finish: client interviews, scope, design in Figma, the database with Prisma and PostgreSQL, and the application with Next.js and Docker. It covered properties, rentals, payments, income and expenses, automated invoicing through the Facturama API, an analytics dashboard with Chart.js, and a public website configurable from the dashboard.
- The website of a boat tour operator in Puerto Vallarta (the Vallarta TOURS case, below).

## Technologies

- **Core**: React, Next.js, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Sass, CSS Modules, shadcn/ui, Radix UI, Material UI, Bootstrap, Framer Motion, React Router, Chart.js · TanStack Query, Zustand, Formik, Zod, Axios, REST, GraphQL · Node.js, Express, Prisma, PostgreSQL, SQL, Firebase, Payload CMS, Shopify and Liquid, Tealium, SnapLogic · Vitest, Jest, Storybook, Lighthouse, Figma · Git, GitHub, Bitbucket, Vite, Vercel, Jenkins, Apache, ESLint, Prettier.
- **Additional** (personal projects and coursework): MongoDB, WebSockets (Socket.IO), Strapi, GitLab, Less, Redux, React Hook Form.

## The four projects of the portfolio

Each case has six anchored sections: `overview`, `challenge`, `approach`, `research`, `design` (design solutions), and `outcome`. The list of works is at [/en#works](/en#works).

### 365 Días de Ajedrez · own project · 2026

- **Role**: founder; product, architecture, design, and code, as the only person on the project. Site: https://www.365diasdeajedrez.com
- **What it is**: the platform of his online chess academy, where people teach, study, and train: courses, classes with a coach, puzzles, game studies, an opening explorer with more than 4 million games (it answers in about 25 ms per move), and an adventure mode to play against the computer. The academy's site is live but still shows its previous version; the platform is built and tested in development, not yet released, so what the case describes (puzzles, adventure, admin area, and the new site) can only be seen in the case's screenshots.
- **The problem**: each student's material lived in WhatsApp, payments and attendance in a spreadsheet, and practice on Lichess. Progress had to be trustworthy: a streak that grows by reloading the page makes the coach decide on false data. And it had to serve an academy, a club, a school, or an independent coach without anyone seeing what is not theirs.
- **Strongest points**:
  - Everything hangs from an organization (an independent coach is a one-person organization), so a single admin area serves everyone, with permissions resolved in one place.
  - Decisions in writing before drawing: 40 product decisions for the puzzles before writing code and 11 more during the build.
  - Puzzles: more than 30,000, imported from Lichess's public database with a strict filter (one in 200 passed), in 6 levels and 32 themes. One scored attempt per puzzle per day, the first wrong move decides, and "Show solution" counts as a miss; the server enforces the rules.
  - A cut-paper adventure mode: twelve rivals in six zones, borrowing the strength of the 45 bots "Play" already had (412 to 2798 Elo, calibrated over more than 6,500 games against Stockfish).
  - Design system: 177 tokens, 144 of them colors with a light and dark pair; tests require every text to reach a 4.5:1 contrast on its background in both themes, and guard other visual rules.
  - Outcome: 111 screens for five roles (student, coach, content editor, organization admin, and platform operator), on 104 data models, on desktop, tablet, and phone, in light and dark themes; more than 2,300 automated tests, 192 Storybook story files that pass axe in both themes, and more than 400 pages of technical documentation. The three-month simulation uses **548 simulated students** (not real ones) in 19 organizations, with about 4,200 classes and more than 1,100 payments.
  - He worked with Claude Code as the build team, under rules he wrote and that the tests guard.
  - The PDF CV describes an earlier stage of the project (it mentions Payload CMS for the public site and 338 unit tests); the figures of this case are more recent.
- **Tools**: Next.js, React, TypeScript, PostgreSQL, Prisma, Material Web, Chessground, chessops, Stockfish, LiveKit, Storybook, Vitest, Vercel.
- **Links**: [overview](/en/works/365-dias-de-ajedrez#overview) · [challenge](/en/works/365-dias-de-ajedrez#challenge) · [approach](/en/works/365-dias-de-ajedrez#approach) · [research](/en/works/365-dias-de-ajedrez#research) · [design solutions](/en/works/365-dias-de-ajedrez#design) · [outcome](/en/works/365-dias-de-ajedrez#outcome)

### Cuarteto Fratres · string quartet website · 2026

- **Role**: designer and developer; product, design, development, CMS modeling, and deployment. Site: https://cuartetofratres.com
- **What it is**: the website of a string quartet from Boca del Río, Veracruz, to showcase their music and support bookings for concerts, weddings, and private events. A single page: upcoming dates, the group, the four musicians, the repertoire with a player, and a contact form.
- **Strongest points**:
  - Payload CMS inside the same Next.js application (at /admin, on PostgreSQL): the group publishes dates, adjusts its repertoire, and handles requests without touching code. Each section asks a service for its data, with launch content as a fallback, so the page never goes blank.
  - A player drawn as a score: the progress bar is a staff whose notes light up as the piece advances, usable with the keyboard; a fixed mini player appears when the card leaves the screen. There are no recordings yet: it simulates playback with each piece's duration.
  - The form posts to a server action, works before the JavaScript loads, and every request is stored in the CMS with its status.
  - A save in the CMS shows on the next visit; continuous integration checks style and types, runs the tests, and builds the site on every push.
- **Tools**: Figma, Next.js, React, TypeScript, Payload CMS, PostgreSQL, Vercel Blob, Vitest, Vercel.
- **Links**: [overview](/en/works/cuarteto-fratres#overview) · [challenge](/en/works/cuarteto-fratres#challenge) · [approach](/en/works/cuarteto-fratres#approach) · [research](/en/works/cuarteto-fratres#research) · [design solutions](/en/works/cuarteto-fratres#design) · [outcome](/en/works/cuarteto-fratres#outcome)

### Reto MD · network of medical sites · 2021–2023

- **Role**: frontend developer at Mellow; he wrote all the code of Reto MD's web presence. The visual design is by Mellow's design team. Site: https://retomd.com (the live site may include changes made after he left in June 2023).
- **What it is**: Reto MD is an app that prepares Mexican physicians for the ENARM, the national medical residency exam. Sebastian built its corporate website (blog, job board, events, webinars, podcasts, information about the app and the ENARM, "About Us") and the network of specialty sites of the Reto brand.
- **Strongest points**:
  - First he built the Reto Dermatología, Reto Cardiología, and Reto Oftalmología websites, each in its own repository.
  - He consolidated the specialty repositories into one multi-tenant application on the Next.js App Router: a TypeScript configuration interface where each brand declares its colors, its visible pages and sections, and its vocabulary, with internationalization through next-intl.
  - A single repository generates six independent Vercel deployments (Cardiología, Dermatología, Oftalmología, Pediatría, Psiquiatría, and Nefrología); with the content ready, a new brand could launch in about an hour.
  - The blog moved to Next.js static generation instead of querying the API on every visit, TanStack Query caches filtered listings, and the sites were optimized with Lighthouse reports.
  - Hybrid authentication between Firebase and the platform's API, standardized form validation with Zod, and the migration from the Pages Router to the App Router with Next.js 14.
- **Tools**: Next.js, React, TypeScript, Tailwind CSS, TanStack Query, NextAuth, Firebase, next-intl, Zod, Vercel.
- **Links**: [overview](/en/works/reto-md#overview) · [challenge](/en/works/reto-md#challenge) · [approach](/en/works/reto-md#approach) · [research](/en/works/reto-md#research) · [design solutions](/en/works/reto-md#design) · [outcome](/en/works/reto-md#outcome)

### Vallarta TOURS · tourism, boat tours · 2020–2021 and 2025

- **Role**: designer and developer. Sample site: https://vallartatours.vercel.app
- **What it is**: Vallarta TOURS is a **fictional brand**: he uses it to present the website he designed and built at Proficient Systems for a boat tour operator in Puerto Vallarta. The original site was live and has since been taken down. For the original he did the client research, wireframes, and high-fidelity designs in Figma, contributed to the site's copy and experience, and built the frontend with bookings, payments, and availability through Shopify. In 2025 he rebuilt it as a **sample site**: its prices, reviews, contact details, and legal texts are placeholders.
- **Strongest points** (the 2025 rebuild):
  - Five trips in Banderas Bay, each with its own price, duration, schedule, capacity per boat, pier, and season (whales only from December to March; the private charter is quoted).
  - Bilingual with next-intl and translated URLs (`/servicios` is `/en/services`); the language switch keeps you on the same page.
  - The booking card adds up the total, works out the 30% deposit, and opens WhatsApp with the message already written in the visitor's language.
  - Custom date and party-size fields with React Day Picker and Radix UI; 67 tests in 17 files and continuous integration; everything is served static from Vercel.
- **Tools**: Figma, Next.js, React, TypeScript, next-intl, Radix UI, React Day Picker, Vitest, Vercel.
- **Links**: [overview](/en/works/vallarta-tours#overview) · [challenge](/en/works/vallarta-tours#challenge) · [approach](/en/works/vallarta-tours#approach) · [research](/en/works/vallarta-tours#research) · [design solutions](/en/works/vallarta-tours#design) · [outcome](/en/works/vallarta-tours#outcome)

## This portfolio

Built with Astro and React, in Spanish and English, and published on Vercel. Blue answers with a Claude model from this information. Blue has no details about who designed this site or how it was made; for that, write to Sebastian.

# Freed — Financial Freedom App

A personal finance PWA for tracking spending, investments, savings and retirement. Built with vanilla HTML/CSS/JS, backed by Supabase for secure per-user data storage.

---

## Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript (no framework)
- **Auth & Database** — Supabase (email/password auth, PostgreSQL with Row Level Security)
- **Charts** — Chart.js 4
- **Fonts** — Nunito + DM Mono (Google Fonts)
- **PWA** — Web App Manifest + Service Worker (offline capable)

---

## Project Structure

```
freed/
├── index.html          # App shell, layout, all page HTML
├── css/
│   └── app.css         # All styles, responsive layout, design tokens
├── js/
│   └── app.js          # All logic, Supabase integration, Chart.js
├── manifest.json       # PWA manifest (icons, theme, display mode)
└── sw.js               # Service worker for offline caching
```

---

## Supabase Setup

### 1. Create the table

Run this in your Supabase SQL editor:

```sql
create table user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table user_data enable row level security;

create policy "Users can only access own data"
  on user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

This stores each user's entire app state as a single JSON blob. Row Level Security ensures users can only ever read and write their own row.

### 2. Configure auth redirect URL

In your Supabase dashboard go to **Authentication → URL Configuration** and set:

- **Site URL** — your deployed domain (e.g. `https://yourapp.netlify.app`)
- **Redirect URLs** — same URL

This controls where the email confirmation link points. Without this it defaults to `localhost`.

### 3. Update credentials in app.js

At the top of `js/app.js`:

```js
const SUPABASE_URL  = 'https://your-project.supabase.co';
const SUPABASE_ANON = 'your-anon-key';
```

---

## Deploying

The app is a static site — deploy the `freed/` folder to any static host.

**Netlify (recommended)**
1. Drag and drop the `freed/` folder into [netlify.com/drop](https://app.netlify.com/drop)
2. Update the Supabase redirect URL to the Netlify URL

**GitHub Pages**
1. Push the `freed/` folder contents to a repo
2. Enable Pages under Settings → Pages → Deploy from branch

**Important:** The service worker requires HTTPS to activate. Both Netlify and GitHub Pages provide this by default.

---

## Installing as a Mobile App

**Android (Chrome)**
1. Open the deployed URL in Chrome
2. Tap the browser menu (⋮)
3. Tap **Add to Home Screen**

**iOS (Safari)**
1. Open the deployed URL in Safari
2. Tap the Share button
3. Tap **Add to Home Screen**

Once installed it launches full-screen with no browser chrome, behaves like a native app, and works offline.

---

## Features

| Screen | What it does |
|---|---|
| **Overview** | Net worth, freedom progress, 6-month spend vs income chart, this month's categories |
| **Spending** | Category management with budgets and progress bars, transaction log, budget overview |
| **Wealth** | Investment tracker (value, contributions, return %), savings goals with progress |
| **Retire** | Compound interest calculator with projected growth chart |
| **Insights** | Auto-generated observations on savings rate, over-budget categories, balance, portfolio |

### Key behaviours

- **Month navigation** — arrows in the topbar move between months; income and expenses are tracked independently per month
- **Auto-save** — data is written to Supabase ~800ms after any change, debounced to avoid excessive writes
- **Income** — tap the income figure on the Overview screen (or the income widget) to set monthly income
- **Delete transactions** — tap any transaction in the Transactions tab to delete it
- **Edit categories / investments / goals** — tap any row to open the edit modal

---

## Data Model

All user data is stored as a single JSON document per user:

```json
{
  "categories": [...],
  "transactions": [...],
  "investments": [...],
  "savings": [...],
  "income": { "2026-04": 45000 },
  "settings": { "freedomTarget": 10000000 }
}
```

Transactions reference categories by `id` and are keyed by `month` (`YYYY-MM`) for fast filtering.

---

## Local Development

No build step needed. Serve the `freed/` folder with any static server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve freed/
```

Then open `http://localhost:8080`. The service worker won't activate over HTTP but everything else works. Supabase auth redirect must also be set to `http://localhost:8080` for local email confirmation to work.

---

## Customisation

| What | Where |
|---|---|
| Colours and fonts | CSS variables at the top of `app.css` |
| Default categories | `defaultCategories` array in `app.js` |
| Default retirement inputs | Input `value` attributes in `index.html` |
| Freedom target default | `settings.freedomTarget` in `getDefaultData()` in `app.js` |
| Currency | `fmtFull()` and `fmt()` functions in `app.js` — currently ZAR (R) |

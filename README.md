# Financius

Financius is a mobile-first investment management SaaS prototype built with Expo and React Native. It is inspired by portfolio consolidation apps, but positioned as an organization, analytics, education, and decision-support tool for individual investors.

The app currently focuses on portfolio tracking, valuation signals, dividends, alerts, and an AI assistant surface designed to avoid direct buy/sell recommendations.

## Preview

Current modules:

- Portfolio dashboard with consolidated equity, return, monthly dividends, and income goal.
- Allocation chart by asset class.
- Equity evolution chart compared with a benchmark.
- Portfolio positions with average price, current price, and safety margin.
- Dividends area with monthly evolution, sector filters, top payers, and yield ranking.
- Opportunity radar for target price and fair value checks.
- AI assistant placeholder with educational wording and backend configuration awareness.

## Stack

- Expo
- React Native
- TypeScript
- React Native SVG
- Expo Vector Icons

Planned backend path:

- Supabase for Auth, PostgreSQL, Storage, and Edge Functions.
- Server-side OpenAI API integration.
- News ingestion and RAG for asset-specific context.
- Guardrails to avoid direct investment recommendations.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm start
```

Run on web:

```bash
npm run web
```

Run type checking:

```bash
npm run typecheck
```

## Expo Go on Android

1. Install Expo Go from the Play Store.
2. Run:

```bash
npm start
```

3. Scan the QR Code with Expo Go.

If your phone cannot connect, switch Expo to Tunnel mode from the terminal and scan the QR Code again.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Public Expo variables must start with `EXPO_PUBLIC_` because they are embedded in the client bundle.

Important: never expose private API keys in the app. OpenAI keys, Supabase service-role keys, and paid news-provider keys must stay in a backend service or Supabase Edge Function.

Available variables:

```txt
EXPO_PUBLIC_APP_NAME=Financius
EXPO_PUBLIC_APP_SLUG=financius
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_SCHEME=financius
EXPO_PUBLIC_APP_TAGLINE=Gestao de investimentos com IA

EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER=com.financius.app
EXPO_PUBLIC_ANDROID_PACKAGE=com.financius.app

EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_NEWS_API_BASE_URL=
EXPO_PUBLIC_AI_ASSISTANT_ENABLED=true

EXPO_PUBLIC_DEFAULT_LOCALE=pt-BR
EXPO_PUBLIC_DEFAULT_CURRENCY=BRL
EXPO_PUBLIC_SPLASH_BACKGROUND=#ffffff
EXPO_PUBLIC_ADAPTIVE_ICON_BACKGROUND=#ffffff
```

Server-only examples:

```txt
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEWS_PROVIDER_API_KEY=
```

These server-only values are intentionally not prefixed with `EXPO_PUBLIC_`.

## Project Structure

```txt
.
├── App.tsx
├── app.config.js
├── src
│   └── config
│       └── env.ts
├── assets
├── package.json
└── .env.example
```

## Product Direction

MVP priorities:

- Manual asset registration.
- Buy/sell transaction history.
- Average price calculation.
- Dividends tracking.
- Dashboard charts.
- Target price and fair value watchlist.
- Relevant news summaries.
- AI assistant connected to portfolio data through a backend.

Future modules:

- Spreadsheet import.
- Supabase Auth and database persistence.
- Multiple portfolios.
- Subscription plans.
- Monthly reports.
- Tax helper.
- Broker/B3 integrations.

## Compliance Note

Financius should be presented as a tool for control, organization, educational analysis, and decision support.

Avoid positioning it as automated investment advisory. In Brazil, personalized investment recommendations may fall under CVM rules for investment consulting and robo-advisory. The AI assistant should explain data, risks, concentration, valuation assumptions, and news context without saying what the user should buy or sell.

## Security Notes

- `.env` and `.env.*` are ignored by Git.
- `.env.example` is safe to commit.
- Do not commit real API keys.
- Use backend endpoints for OpenAI, paid news providers, and privileged Supabase operations.
- Keep client-side Supabase usage limited to the anon key with Row Level Security enabled.

## Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run typecheck
```

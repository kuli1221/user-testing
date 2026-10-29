# Slider vs knapper – oppsett
1. Supabase: nytt prosjekt → SQL Editor → lim inn og kjør `schema.sql`.
2. Supabase: Project Settings → Database → Connection string → **Transaction pooler** (port 6543).
3. Vercel: importer repoet. Environment variables: `DATABASE_URL`, `EXPORT_KEY` (se `.env.example`).
4. Lokalt: `npm i`, kopier `.env.example` til `.env`, kjør `npx vercel dev`.
5. Eksport: `/api/export?format=long&key=EXPORT_KEY` eller `format=wide`.

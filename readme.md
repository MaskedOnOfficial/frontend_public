# maskOn Frontend

React + TypeScript client for maskOn.

## Stack

- React 19
- TypeScript 5
- Vite 7
- TailwindCSS 4
- React Router 7
- Axios

## Structure

- `src/pages/` - Route-level pages
- `src/components/` - Reusable UI components
- `src/context/` - Auth state and session bootstrapping
- `src/lib/` - API client and shared frontend helpers
- `src/types/` - Shared TypeScript interfaces used across pages/components

## Runtime behavior

- Base API URL is `/api/v1` in `src/lib/api.ts`.
- Access token is attached to requests from `localStorage`.
- 401 responses trigger refresh-token rotation through `/auth/refresh`.
- Vite dev server proxies `/api/*` to backend `http://localhost:5000`.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production bundle
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Local setup

1. Install dependencies:
   - `npm install`
2. Start backend in `../backend`.
3. Start frontend:
   - `npm run dev`
4. Open `http://localhost:5173`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## FastAPI backend connection check

`app/page.tsx` calls the backend API configured by `NEXT_PUBLIC_API_BASE_URL`.
For local development, set this in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Start the backend first:

```bash
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Then start the frontend:

```bash
cd ../building-ui-main
npm run dev
```

Open the frontend at [http://localhost:3000](http://localhost:3000). If Next.js uses another port, open [http://localhost:3001](http://localhost:3001).

To verify the connection:

- Run `python -m app.mock_seed` in the backend once after pulling these changes.
- Enter at least two characters such as `송파` or `거여` in the main address input.
- Confirm address candidates appear below the input.
- Click a candidate and confirm the input changes to the selected `display_address`.
- Click `진단 시작`.
- Confirm the browser Console prints `백엔드 응답:`.
- Confirm the Network tab shows `GET http://localhost:8080/api/buildings?query=...&page=1&limit=20`.
- Confirm the Network tab shows `POST http://localhost:8080/api/report` with status `200`.
- Confirm the page moves to `/dashboard?address=...`.
- Open `/search?query=송파` and confirm backend search results appear.
- Confirm the backend terminal shows logs similar to `POST /api/report HTTP/1.1" 200 OK`.

The main app flow is:

```text
/ or /search
-> /dashboard?address=...
-> /report?address=... or /compare?address=...
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

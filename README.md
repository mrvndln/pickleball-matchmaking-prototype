# Court Flow — Pickleball Matchmaking Prototype

A client-presentation-ready Next.js prototype for a pickleball doubles matchmaking and queue management system.

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Included prototype modules

- Overview dashboard and session metrics
- Player registration, search, and removal
- Random 2v2 doubles matchmaking
- Game status management (Queued, Ongoing, Completed)
- Manual winner recording
- Winner and loser queue grouping and next-round generation
- Match history
- Public live court display with fullscreen support

## Deploy to Vercel

1. Create a GitHub repository and push this project.
2. Sign in to Vercel using your GitHub account.
3. Select **Add New → Project** and import the repository.
4. Keep the default Next.js build settings.
5. Select **Deploy**.
6. Share the generated `*.vercel.app` URL with your client.

## Prototype limitations

This is a frontend-only demonstration. Data is stored in React state and resets when the page is refreshed. It does not yet include a backend, database, login, real-time multi-device updates, court configuration, or production-grade matchmaking rules. These should be implemented and tested before operational use.

## Suggested next development phase

- Laravel API and MySQL persistence
- Admin/operator authentication and roles
- Configurable session and court management
- Agreed winner/loser queue algorithm, including carry-over and waiting rules
- Real-time live display updates (WebSockets or polling)
- Audit trail and authorized result corrections

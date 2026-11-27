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
- Randomized 2v2 opening round followed by a double-elimination bracket
- Doubles partners stay together; winner-bracket losses drop to the loser bracket, where a second loss eliminates the team
- Winner-bracket and loser-bracket champions meet in a grand final, with a reset final if the loser-bracket champion wins
- Game status management (Queued, Ongoing, Completed)
- Point-by-point scorekeeping with manual game completion and score correction controls
- End-game winner is determined by the higher score; tied scores must be resolved before ending
- Elapsed play-time starts only when an operator starts a match and is shown on the live court screen
- Winner and loser queue grouping and next-round generation
- Match history
- Public live court display with fullscreen support and last result shown until the next game starts

Standard pickleball games are typically played to 11 points and must be won by 2; this prototype leaves game completion to the operator. Official rules do not prescribe a fixed number of minutes per game. See the [USA Pickleball rules](https://usapickleball.org/rules/) and [how-to-play guide](https://usapickleball.org/what-is-pickleball/how-to-play/).

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

# Game Room

A set of realtime multiplayer browser games built to play with colleagues. Everything runs over a single Socket.IO server, so players join a room and see each other's moves live.

## The games

- **Fight** (`/fight`) is a two-player arena brawler. Players join a room, a countdown starts, and actions are broadcast between clients until someone is knocked out.
- **Piano** (`/piano`) is a shared piano. Notes played by anyone in the room are synthesised with Tone.js and heard by everyone at once.
- **Tic-tac-toe** (`/tictactoe`) is the classic game, with turns synced live between the two players.

## Stack

- **Next.js 16** and **React 19** on the App Router
- **Socket.IO** for realtime rooms and event broadcasting, served from a Next.js API route (`src/pages/api/socket.ts`)
- **Tone.js** for audio synthesis in the piano
- **Tailwind CSS 4**, **Framer Motion** for animation, and **canvas-confetti** for win celebrations

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a game. To play against someone, open a second browser window and join the same game.

# Party 2020

<img width="1280" alt="Party 2020 Screenshot" src="https://user-images.githubusercontent.com/45425087/80960728-b756f280-8e09-11ea-9b5a-98d2cbfc07db.png">

## Concept

Due to the COVID-19 pandemic, throwing parties was no longer an option. Party 2020 is an online web application that brings music lovers together — a virtual place where people can chat and listen to the same music in real time, just like in real life.

Any Spotify Premium user can create or join a party. To create a party, log in with a Spotify Premium account and choose a playlist. All tracks from that playlist will be available for the party, and everyone listens through their own Spotify app in sync.

The party creator becomes the **host**. The host can copy and share the party code with others. Guests who join can chat, listen along, and even become the **DJ** when the host grants them permission.

## Features

- **Real-time sync** — Everyone in the party hears the same track at the same position
- **DJ controls** — Play/pause, skip, shuffle, repeat, seek, volume control
- **Queue system** — DJ/host can queue tracks from the playlist, search, or recommendations
- **Live chat** — Real-time messaging with user avatars and colored usernames
- **Voice announcements** — Push-to-talk voice messages from DJ/host
- **Spotify search** — Search any song on Spotify and queue it
- **Recommendations** — Get song suggestions based on the currently playing artist
- **Auto-play** — When a track ends, the next one plays automatically from queue or playlist
- **Role system** — Host, DJ, and Guest roles with appropriate permissions

## Tech Stack

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) — Server
- [Socket.IO](https://socket.io/) — Real-time WebSocket communication
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) — Database
- [EJS](https://ejs.co/) — Server-side templating
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) — Music data and playback control

## Installation

1. Download [Node.js](https://nodejs.org/) if you don't have it
2. Clone this repository
3. Navigate to the repository folder
4. Run `npm install` to install dependencies
5. Create a `.env` file with the following variables:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/callback
MONGODB_URI=your_mongodb_connection_string
PORT=8080
NODE_ENV=development
```

6. Run `npm run dev` to start the development server at `http://127.0.0.1:8080/`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with auto-restart (nodemon) |
| `npm start` | Start production server |
| `npm run build` | Build all assets (CSS, JS, images) |
| `npm run watch` | Watch for file changes and rebuild |

## Architecture

### OAuth Flow

1. User clicks "Login with Spotify" → redirected to Spotify authorization (with CSRF state parameter)
2. Spotify redirects back to `/callback` → state is verified, tokens are stored in cookies
3. Access token auto-refreshes on expiry via `spotifyFetch()` wrapper (client) and `refreshAccessToken()` (server)

### Real-Time Events

All real-time communication uses Socket.IO. The broadcast pattern: DJ/host emits an action → server validates input and checks role → broadcasts to the room → each client executes the Spotify API call with their own token.

Key events:
- `join party` / `disconnect` — Room management with host reassignment
- `getSong` / `playSong` — Play a track for all users
- `play pause` / `skip track` / `shuffle toggle` / `repeat toggle` / `seek track` — DJ controls
- `set volume` — Volume control for all users
- `queue track` / `queue remove` — Server-side queue management
- `announcement` — Push-to-talk voice messages
- `chat message` — Real-time chat
- `dj` — Host assigns/removes DJ role

### Security

- Input validation and sanitization on all Socket.IO events
- Server-side role authorization for DJ/host-only actions
- CSRF protection on OAuth flow
- Rate limiting on chat and announcements
- Content Security Policy and security headers
- XSS prevention in EJS templates
- HttpOnly refresh token cookie

### Data Life Cycle

![DLC](https://user-images.githubusercontent.com/45425087/80980219-a9fd3080-8e28-11ea-8f9f-68e410738a44.png)

## Spotify API

This app uses the [Spotify Web API](https://developer.spotify.com/documentation/web-api/) with OAuth 2.0 Authorization Code flow. A Spotify Premium account is required for playback control. The API is used for:

- User authentication and profile data
- Fetching playlists and tracks
- Playback control (play, pause, skip, seek, volume, shuffle, repeat)
- Search
- Artist-based recommendations

## License

[MIT](https://github.com/MohamadAlGhorani/real-time-web-1920/blob/master/LICENSE)

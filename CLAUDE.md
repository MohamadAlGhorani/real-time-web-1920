# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Party 2020** — a real-time collaborative Spotify listening party app. Users authenticate with Spotify, create or join party rooms based on playlist IDs, and listen to music together in sync. Built with Express 4, Socket.IO 4, MongoDB (Mongoose 8), and EJS 3 templates. Dark theme UI using Google Material Symbols icons and Inter font. Custom SVG favicon with "2020" branding.

## Commands

- **Dev server (with auto-restart):** `npm run dev` (uses nodemon)
- **Production start:** `npm start` (runs `node server.js`)
- **Build all assets:** `npm run build` (cleans `static/`, then runs build:css, build:js, build:assets)
- **Build individually:** `npm run build:css`, `npm run build:js`, `npm run build:assets`
- **Watch for changes:** `npm run watch` (watches src/js, src/css, src/images)
- **No test suite configured**

Note: `npm run dev` and `npm start` both run `npm run build` automatically via pre-scripts.

## Architecture

### Server Entry Point

[server.js](server.js) is the single entry point. It sets up Express, Socket.IO (attached to the HTTP server), connects to MongoDB, defines all routes, and contains **all real-time Socket.IO event handling inline**. Also manages in-memory `rooms` (user tracking) and `roomQueues` (queue state per room).

### Spotify OAuth Flow

1. `GET /login` — redirects to Spotify authorization with scopes and a CSRF `state` parameter
2. `GET /callback` — verifies `state`, exchanges code for tokens, stores `accessToken` (cookie) and `refreshToken` (httpOnly cookie). Cookies use `Secure` flag in production.
3. `GET /refresh` — client-side endpoint to refresh expired access tokens using the httpOnly refresh token. Called automatically by `spotifyFetch()` on 401.
4. Token refresh is also done server-side in the party and setup routes when a 401 is detected.

Token refresh module: [routes/oAuth/refreshToken.js](routes/oAuth/refreshToken.js) — shared by server routes and the `/refresh` endpoint.

### Required Environment Variables (`.env`)

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (e.g. `http://127.0.0.1:8080/callback` for local dev)
- `MONGODB_URI`
- `PORT` (optional, defaults to 8080)
- `NODE_ENV` (set to `production` for `Secure` cookies)

### Route Structure

- `GET /` — Landing/login page
- `GET /login` — Spotify OAuth redirect (with CSRF state)
- `GET /callback` — OAuth callback (verifies state, sets tokens)
- `GET /refresh` — Token refresh endpoint (returns JSON)
- `GET /home` — Home page (join or create party)
- `GET /setup` — Fetches user's Spotify playlists to pick one for a party (auto-refreshes token)
- `GET /join` — Redirects to a party room via `?party_id=` query param (validates input)
- `GET /party-:id` — Party room page. The `:id` is a Spotify playlist ID. Auto-refreshes token on 401.

### Security

**Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` (restricts scripts, styles, images, connections, media to trusted origins).

**OAuth:** CSRF protection via random `state` parameter stored in httpOnly cookie.

**Cookies:** `refreshToken` is httpOnly. Both cookies use `Secure` in production and `SameSite=lax`.

**Socket.IO input validation:**
- Room IDs: `^[a-zA-Z0-9]{1,64}$`
- Usernames: max 100 chars
- Avatar URLs: validated protocol (http/https)
- Track IDs: `^[a-zA-Z0-9]{1,64}$`
- Spotify URIs: `^spotify:track:[a-zA-Z0-9]{1,64}$`
- Volume: integer 0-100
- Seek position: 0-600000ms
- Audio data: max 1MB
- Chat messages: truncated to 500 chars
- All string inputs sanitized via `sanitizeString()`

**Server-side role checks:** All DJ/host-only events (`getSong`, `play pause`, `skip track`, `shuffle toggle`, `repeat toggle`, `seek track`, `set volume`, `queue track`, `queue remove`, `announcement`) verify the emitter is host or DJ via `isHostOrDj()`. Only the host can assign DJs.

**Rate limiting:** Chat (15/10s), announcements (3/30s). Rate limit maps cleaned on disconnect and periodically.

**Room cleanup:** Empty rooms and queues deleted when last user disconnects.

**EJS XSS prevention:** JSON injections in `<script>` blocks escape `<` as `\u003c` to prevent `</script>` breakout.

### User Roles

- **Host**: The playlist owner (auto-detected). Can assign DJs, has all playback controls, persists across reconnects. If the host disconnects, the next user is auto-promoted.
- **DJ**: Assigned by the host. Has playback controls (play/pause, skip, shuffle, repeat, seek, volume, queue, announce). When a new DJ is assigned, the old DJ loses controls.
- **Guest**: Can chat, listen, and view now-playing. No playback controls.

Host always retains controls even if a DJ is assigned.

### Real-Time Socket Events

**Broadcast pattern**: DJ/host emits an action to the server, server validates input and checks role, then broadcasts to the room. Each client executes the Spotify API call with their own token via `spotifyFetch()`.

Key events:
- `join party` / `disconnect` — room management with host reassignment on disconnect
- `getSong` / `playSong` — play a track for all users (role-checked)
- `play pause` / `skip track` / `shuffle toggle` / `repeat toggle` / `seek track` — DJ controls (role-checked)
- `set volume` — broadcast volume change (role-checked)
- `queue track` / `queue remove` — server-side queue management with `roomQueues` in-memory store, synced to new joiners (role-checked)
- `announcement` — push-to-talk voice messages via MediaRecorder API (role-checked, rate-limited)
- `rights` — determines host/guest role on join, auto-plays current track for guests
- `chat message` — real-time chat with colored messages and user avatars (rate-limited)
- `dj` — host assigns DJ, old DJ loses controls, new DJ gets them (host-only)

### Auto-Play

The DJ/host's client polls Spotify every 5 seconds (`checkTrackEnd`). When a track ends:
1. Play the next track from the manual queue (`partyQueue`)
2. If queue is empty, play the next track from the playlist sequentially (loops back to start)
3. If shuffle is on, pick a random playlist track

`playlistIndex` tracks the current position in the playlist for sequential playback.

### Token Refresh

Client-side `spotifyFetch()` wrapper handles all Spotify API calls:
- Injects `Authorization: Bearer` header automatically
- On 401 or missing token, calls `GET /refresh` to get a new token via the httpOnly refresh token
- Retries the original request with the fresh token
- Deduplicates concurrent refreshes (single `refreshPromise`)
- Redirects to login if refresh fails

Server-side routes (`/party-:id`, `/setup`) also retry with `refreshAccessToken()` on 401.

### User Avatars

Spotify profile images flow through the entire stack:
- Server fetches avatar from `/v1/me` and passes to party template
- Client stores `userAvatar` globally, sends it with `join party`
- Server stores `socket.userAvatar` per connection, includes in user list broadcasts
- Chat uses server-stored `socket.userAvatar` (not client-sent avatar) for security
- UI shows avatar images with initials fallback (`getInitials()`) everywhere: top bar profile, chat bubbles, user list
- Use `referrerpolicy="no-referrer"` on all Spotify-hosted `<img>` tags

### Database Layer

- **Model:** [database/models/party.js](database/models/party.js) — `partyId`, `users[]`, `hostId`, `djId`, `currentTrack`, `trackPosition`
- **Services:** [database/services/party.js](database/services/party.js) — CRUD for parties, user management, host/DJ assignment, track position persistence. Note: uses `exports.remove()` (not `this.remove()`) due to arrow functions.

### Build Pipeline

Scripts in [scripts/](scripts/):
- `build-css.js` — PostCSS + Autoprefixer + clean-css: `src/css/*.css` → `static/index.css`
- `build-js.js` — Simple concatenation: `src/js/*.js` → `static/index.js` (file order: closeButton, copyToClipBoard, descoLights, socket)
- `build-assets.js` — Copies `src/images/**` → `static/`

### Client-Side Code

All client JS in `src/js/` concatenated into `static/index.js`. No module bundler — simple concat. The party view injects `room`, `name`, `userAvatar`, and `playlistTracks` as global JS variables (escaped with `\u003c`).

Key files:
- `src/js/closeButton.js` — Viewport height fix, sidebar tabs, mobile navigation
- `src/js/copyToClipBoard.js` — Party code copy with visual feedback
- `src/js/descoLights.js` — Decorative disco light animation on the landing page
- `src/js/socket.js` — All Socket.IO logic, `spotifyFetch()` wrapper with auto-refresh, search, recommendations, progress bar, DJ controls, announce, queue management, auto-play, chat with avatars

### UI Structure

Dark theme with CSS custom properties in `:root`. Layout uses CSS Grid for desktop (2-column: main + sidebar) and mobile bottom navigation with panel switching.

Sidebar has 4 tabs: Tracks (playlist), Search (Spotify search), For You (recommendations), Users (guest list with avatars and role-based border colors). Mobile duplicates these as full-screen panels.

Top bar shows: favicon logo + "Party 2020" brand, party code (copyable), and user profile (greeting + avatar on desktop, avatar only on mobile).

Announce button: icon + text on desktop, icon-only circle on mobile (`.announce-text` hidden via CSS).

External dependencies (CDN): Google Inter font, Material Symbols Outlined icons.

### Spotify API Features

DJ/Host can:
- Play/pause, skip, shuffle, repeat (off/track/context)
- Seek to position in track (click progress bar)
- Queue tracks (from playlist, search, or recommendations) with visual queue panel
- Remove tracks from queue
- Search any song on Spotify
- Get recommendations based on current artist
- Control volume for all users
- Push-to-talk voice announcements

### Adding New Features

1. Add socket event handler in `server.js` (broadcast pattern: `io.to(room).emit(...)`)
2. Add input validation (`isValidRoomId`, etc.) and role check (`isHostOrDj`) if needed
3. Add client-side handler in `src/js/socket.js` (use `spotifyFetch()` for Spotify API calls)
4. Add UI elements in `views/party.ejs` (both desktop sidebar and mobile panel)
5. Add styles in `src/css/style.css` using existing CSS variables
6. Run `npm run build` to regenerate static files

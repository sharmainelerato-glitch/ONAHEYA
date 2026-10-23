
<div align="center">

# ONAHEYA ♡

### Different Places. Same Room.

**Watch together. Feel closer. Make every story a shared experience.**

A social streaming platform that brings entertainment,
friendship, conversation, and shared experiences into
one connected space.

[**Launch ONAHEYA**](https://onaheya.vercel.app/)
&nbsp;·&nbsp;
[**GitHub Repository**](https://github.com/sharmainelerato-glitch/ONAHEYA)
&nbsp;·&nbsp;
[**Report an Issue**](https://github.com/sharmainelerato-glitch/ONAHEYA/issues)

![License](https://img.shields.io/badge/License-MIT-green)
![React](https://img.shields.io/badge/React-Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Node.js-339933)
![Status](https://img.shields.io/badge/Status-Active_Development-blue)

</div>

---

## The Idea

Movies and series bring people together, but streaming
often remains an individual experience.

Friends watch from different homes. Couples spend time
apart. Communities discuss their favourite stories across
disconnected social platforms.

**ONAHEYA brings those experiences into one place.**

Instead of only asking what someone wants to watch,
ONAHEYA also asks:

**Who do you want to experience it with?**

The platform connects on-demand entertainment with
synchronized viewing, social interaction, personal
recommendations, and meaningful shared moments.

---

## What Is ONAHEYA?

ONAHEYA is a social entertainment platform where users
can discover movies and series, create shared viewing
rooms, communicate in real time, and build connections
around the stories they love.

It combines three core experiences:

| Experience | Description |
|------------|-------------|
| Watch | Discover and enjoy available movies and series |
| Together | Watch in synchronized rooms with other people |
| Connect | Share recommendations, discussions, and memories |

ONAHEYA is designed around the idea that entertainment
can create connections, even when people are physically
apart.

---

## Features

### 1. Movies and Series

- Browse available movies and series
- Discover titles through an organized interface
- Open film and series detail pages
- Play supported demo media
- Explore multiple episodes where available
- Access media hosted through Cloudflare R2

ONAHEYA distinguishes between catalogue metadata and
playable video content. Discovering a title does not
automatically mean the full movie or series is licensed
or available for streaming.

### 2. Watch Together

Create shared viewing rooms and enjoy films with others,
even from different locations.

Features include:

- Public and private watch rooms
- Unique room codes
- Host-controlled playback
- Synchronized play and pause
- Playback-position synchronization
- Real-time room updates
- Shared room conversations
- Floating reactions and social interactions

Real-time functionality is powered by Socket.IO.

### 3. Social Watch Rooms

ONAHEYA brings communication directly into the
viewing experience.

Room features include:

- Group chat
- Optional private participant messages
- Host-controlled private messaging permissions
- Shared reactions
- TapTap gestures
- Shared moments and memories
- Room mood and atmosphere settings

This allows people to enjoy either a quieter viewing
experience or a more social movie night.

### 4. ONAHEYA Community

Users can connect with other people through a
movie-focused community.

Community features include:

- Personal profiles
- Unique usernames
- Profile photographs
- Bios and favourite genres
- Discoverable users
- Following and followers
- Film and series recommendations
- Reactions and comments
- Reposting recommendations
- Saving and sharing posts
- Notifications

### 5. Direct and Group Messages

ONAHEYA supports conversations beyond watch rooms.

Users can:

- Send direct messages where mutual-follow
  requirements are satisfied
- Create group conversations
- Invite other users
- Accept or decline invitations
- Share their thoughts about entertainment

### 6. Story Circles

Story Circles create dedicated discussion spaces
around films and stories.

Features include:

- Title-specific discussions
- Spoiler-aware posts
- Community reactions
- Watch-next participation
- Shared watchlists
- Story-related conversations

### 7. Movie Dates

Users can organize shared viewing experiences.

Features include:

- Scheduled movie dates
- Invitations
- Invitation responses
- Selected viewing moods
- Associated live watch rooms

### 8. ONAHEYA Guide

ONAHEYA includes an AI-assisted discovery experience
to help users explore entertainment and navigate
their viewing choices.

The backend supports integration with Groq for
AI-powered guidance.

AI-generated recommendations may be imperfect and
should not be treated as guarantees of content
availability or suitability.

### 9. Books and Stories

ONAHEYA explores the connection between books and
screen adaptations.

The prototype includes reading and discussion
experiences for supported material.

Full-text access is limited to works that are
public domain, appropriately licensed, or used
with permission.

### 10. Authentication

ONAHEYA supports:

- Email registration through Supabase Auth
- Unique public usernames
- Email verification
- Email and password sign-in
- Password recovery
- Profile management
- Existing username-based account access
  during the transition

Supabase authentication is connected to the ONAHEYA
backend through a verified-token exchange.

Existing accounts require a separate migration or
linking process before they can use Supabase-based
password recovery.

---

## Fire TV Development

ONAHEYA is being adapted for a television experience
as part of the Amazon Build, Ship, Shape Hackathon.

### Target Experience

The TV version aims to provide:

- A television-friendly interface
- Fullscreen video playback
- Directional remote-control navigation
- Clear focus indicators
- Browse and film selection with a D-pad
- Back-button navigation
- Access to watch-room experiences

### Planned Technical Approach

The existing React application will be reused inside
a TV-targeted Android application.

The Android implementation will provide a launcher,
fullscreen presentation, and integration with
television remote input.

### Current Status

The web application is deployed.

The Android TV wrapper, remote-control experience,
and emulator demonstration are in development.

A successful browser deployment does not by itself
verify Fire OS compatibility.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, JavaScript, Vite |
| Styling | CSS |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO |
| Authentication | Supabase Auth and ONAHEYA session bridge |
| AI integration | Groq |
| Film metadata | TMDB API |
| Video storage | Cloudflare R2 |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Version control | Git and GitHub |
| TV development | Android TV / Fire TV-targeted application (in progress) |

---

## System Architecture

```text
                   ONAHEYA
                      |
          +-----------+-----------+
          |                       |
     React Frontend          Android TV App
        (Vite)                 (planned)
          |                       |
          +-----------+-----------+
                      |
                HTTPS / WebSocket
                      |
               Node.js Backend
               Express + Socket.IO
                      |
        +-------------+-------------+
        |             |             |
   Supabase Auth   Groq AI      TMDB Metadata
        |
   Verified Identity
        |
   ONAHEYA Profiles
   and Social Features

Cloudflare R2
      |
Playable Media Delivery
```

The Node.js backend manages community operations,
social relationships, watch-room coordination,
and the ONAHEYA account-session bridge.

Supabase handles email/password authentication,
while Cloudflare R2 delivers supported media files.

**Prototype storage limitation:** Some ONAHEYA
account and social data currently use a local
JSON store. A persistent database is required
for reliable long-term production storage.

---

## Getting Started

### Prerequisites

Install:

- Node.js and npm
- Git
- A code editor such as Visual Studio Code

Optional, depending on the features you are testing:

- A Supabase project
- A Groq API key
- TMDB API credentials
- Cloudflare R2 media hosting
- Android Studio for TV development

### Clone the Repository

```bash
git clone https://github.com/sharmainelerato-glitch/ONAHEYA.git
cd ONAHEYA
```

### Install Frontend Dependencies

```bash
npm install
```

### Install Backend Dependencies

```bash
cd server
npm install
```

### Configure the Frontend

Create `.env.local` in the root directory:

```env
VITE_SOCKET_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_MEDIA_BASE_URL=YOUR_PUBLIC_MEDIA_BASE_URL
```

For local development without R2 hosting, the media
base URL may be omitted if the selected media exists
at the paths expected by the frontend.

### Configure the Backend

Create `server/.env`:

```env
PORT=3001
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
TMDB_READ_ACCESS_TOKEN=YOUR_TMDB_TOKEN
```

Some integrations are optional for starting the
application but are needed for their related features.

Never commit `.env` files, database credentials,
secret keys, or personal tokens to GitHub.

### Start the Backend

Open a terminal:

```bash
cd server
npm run dev
```

Use the start script defined in `server/package.json`
if the development command differs.

### Start the Frontend

Open another terminal in the project root:

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

http://localhost:5173

### Production Build

```bash
npm run build
```

The compiled frontend will be generated in `dist/`.

### Health Check

When the backend is running locally, open:

http://localhost:3001/health

A successful response indicates that the API
process is responding.

---

## Deployment

### Frontend — Vercel

Production website:

https://onaheya.vercel.app

Recommended Vercel build configuration:

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | npm run build |
| Output directory | dist |
| Install command | npm ci |

Frontend environment variables must be configured
in the Vercel project settings.

### Backend — Render

Backend base URL:

https://onaheya-backend.onrender.com

The backend uses Express and Socket.IO.

Configure production environment variables through
Render's dashboard and include the deployed
frontend origin in `CLIENT_ORIGINS`.

The backend must use persistent storage before
the platform is used for important real-user data.

---

## Responsible Use and Content Rights

ONAHEYA is a technology prototype and social
entertainment application.

The repository's software license does not grant
redistribution rights to third-party films, music,
books, posters, logos, or other licensed materials.

Playable media must be used according to the
applicable copyright, attribution, and licensing
requirements.

TMDB is used for metadata where configured.
TMDB metadata is separate from movie playback rights.

The project is not affiliated with or endorsed by
Amazon, TMDB, Groq, Supabase, or Cloudflare.

---

## Security and Privacy Notes

- Supabase access tokens are verified server-side
  before creating ONAHEYA sessions.
- Protected social endpoints require authentication.
- Private messaging is restricted to authorized
  participants.
- Room hosts control selected room permissions.
- Environment secrets must remain outside Git.
- Legacy accounts require secure ownership
  verification before migration.

The application is still under development and
has not undergone a comprehensive production
security audit.

---

## Development Roadmap

- [x] React streaming interface
- [x] Backend API
- [x] Real-time watch rooms
- [x] Synchronized playback
- [x] Community and social profiles
- [x] Following and notifications
- [x] Direct and group messaging
- [x] Movie Dates
- [x] Story Circles
- [x] Cloud-hosted demo media
- [x] Supabase email authentication integration
- [x] Password recovery implementation
- [ ] Complete migration of legacy accounts
- [ ] Move social data to persistent database storage
- [ ] Complete Android TV application wrapper
- [ ] Implement and test D-pad navigation
- [ ] Validate Fire TV playback and usability
- [ ] Test the TV experience in the emulator
- [ ] Publish the TV demonstration video
- [ ] Improve accessibility and automated testing
- [ ] Expand the licensed content catalogue

Completed items describe implemented prototype
features, not a guarantee of production readiness.

---

## Contributing

Contributions, suggestions, bug reports, and
improvements are welcome.

To contribute:

1. Fork this repository.
2. Create a feature branch.
3. Make and test your changes.
4. Open a pull request explaining what changed.

Please do not include credentials, private user
information, or unlicensed media in contributions.

You can also report issues through the repository's
GitHub Issues page.

---

## License

ONAHEYA's original source code is made available
under the **MIT License**.

See [LICENSE](LICENSE) for the complete terms.

Third-party libraries, media assets, fonts,
trademarks, and external services remain subject
to their own licenses and terms.

---

<div align="center">

### Different Places. Same Room. ♡

**ONAHEYA**

Built for stories worth sharing.

[Explore ONAHEYA](https://onaheya.vercel.app)

</div>

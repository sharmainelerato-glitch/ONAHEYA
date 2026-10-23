<div align="center">
ONAHEYA ♡
Different Places. Same Room.
A social streaming experience where watching becomes something we share.
Live Website · Source Code
</div>
---
The idea
Streaming makes it easy to find a story, but it doesn't always make it easy to experience that story together. Friends watch from different places, react in separate chats, and often lose the little moments that make movie nights memorable.
ONAHEYA brings the social experience into the viewing experience. It combines a film-and-series discovery interface with shared watch rooms, conversation, recommendations, and ways to connect over the stories we love.
The goal is simple: distance shouldn't mean watching alone.
Experience highlights
Experience	What it offers
Watch Together	Create or join rooms with synchronized, host-controlled playback.
Live room chat	Talk and react while watching, with room-level messaging controls.
Private room messages	Optional one-to-one conversation between participants, subject to host settings.
TapTap & shared moments	Send lightweight gestures and capture moments worth remembering during a session.
Movie and series browsing	Discover titles and explore a curated playable demo catalogue.
ONAHEYA Guide	AI-assisted discovery and conversation features powered through a server-side integration.
Community	Share recommendations and reviews, react, comment, repost, save, and follow other members.
Movie Dates	Plan a viewing session and invite other ONAHEYA members.
Messages	Direct messaging between mutual followers and invite-based group conversations.
Story Circles	Discuss films and participate in film-specific community experiences.
Shared watchlists	Build watchlists with other members.
Book-to-screen exploration	A reading and discussion experience for supported content.
Offline downloads	An experimental, browser-dependent offline viewing experience for supported demo media.
> **Demo scope:** Playback is limited to the demo media included or configured for this project. A title appearing in discovery results does **not** imply ONAHEYA has distribution or playback rights to it.
How ONAHEYA works
Discover a film, series, or conversation worth joining.
Create or join a watch room using a room code.
Watch together as host playback changes are synchronized across participants.
React and connect through chat, gestures, private messages, and shared moments.
Keep the conversation going through community recommendations, Story Circles, messages, and watchlists.
Tech stack
Layer	Technology
Frontend	React, JavaScript, Vite, CSS
Backend	Node.js, Express
Real-time communication	Socket.IO
Authentication	Existing ONAHEYA backend sessions; Supabase Auth integration in progress
AI features	Groq-backed server integration
Media delivery	Cloudflare R2
Film and series metadata	TMDB integration for discovery metadata, when configured
Frontend hosting	Vercel
Backend hosting	Render
Live deployment
Frontend: https://onaheya.vercel.app/  
Backend health endpoint: https://onaheya-backend.onrender.com/health
The live frontend and backend are deployed separately. Some features require the backend service to be awake and correctly configured. A deployed URL is not, by itself, proof that every feature has passed end-to-end testing.
Run locally
Prerequisites
Node.js and npm compatible with the project's installed dependencies
Git
Optional: credentials for Supabase, Groq, TMDB, and configured Cloudflare R2 media URLs
1. Clone the repository
```bash
git clone https://github.com/sharmainelerato-glitch/ONAHEYA.git
cd ONAHEYA
```
2. Install frontend dependencies
```bash
npm install
```
3. Configure frontend environment
Create `.env.local` in the repository root:
```dotenv
VITE_SOCKET_URL=http://localhost:3001
VITE_MEDIA_BASE_URL=https://YOUR-PUBLIC-MEDIA-DOMAIN
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```
`VITE_SUPABASE_*` is only needed when testing the Supabase-enabled frontend. Never put a Supabase secret/service-role key or a Groq API key in a `VITE_` environment variable.
4. Install and configure the backend
```bash
cd server
npm install
```
Configure the backend's environment in `server/.env` or your shell:
```dotenv
PORT=3001
CLIENT_ORIGINS=http://localhost:5173,https://onaheya.vercel.app
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
TMDB_READ_ACCESS_TOKEN=YOUR_TMDB_READ_ACCESS_TOKEN
```
Only configure integrations you intend to use. The Supabase variables require the matching `/api/auth/supabase` backend route to be implemented and deployed. Do not place production secrets in the repository.
Start the backend using the start command defined in `server/package.json` (typically `npm start`), or its configured Node entry point. Then return to the project root and start the frontend:
```bash
cd ..
npm run dev
```
Open the local URL shown by Vite (normally `http://localhost:5173`).
5. Production build
```bash
npm run build
npm run preview
```
The frontend build outputs static files to `dist/`.
Authentication status
ONAHEYA originally implemented username/password registration, password hashing, and backend-issued session tokens. Those tokens authorize profiles and social routes.
A Supabase email-authentication upgrade is being integrated to support:
Email, unique username, and password registration
Email confirmation
Email/password sign-in
Forgot-password emails and password reset
A secure identity bridge into existing ONAHEYA profiles
Important: The Supabase flow must be tested end to end and the backend bridge must be deployed before these capabilities should be considered production-ready. Older username-based accounts require an explicit, verified account-linking process; they must not be reassigned based on a matching username or email alone.
Architecture
```text
Browser / React + Vite (Vercel)
   |         |               |
   |         |               +--> Cloudflare R2 (configured demo video files)
   |         +------------------> Supabase Auth (email sign-in / recovery; integration in progress)
   |
   +--> Express API + Socket.IO (Render)
            |--> Profile and social APIs
            |--> Watch room synchronization
            |--> Groq integration (server-side)
            +--> TMDB metadata requests (when configured)
```
Current limitations and next steps
Persistent storage: The current backend prototype stores account and social data in a local JSON file. On an ephemeral Render filesystem, those records may be lost after a restart or redeploy. Migrating to durable database storage is a priority before production use.
Authentication migration: Supabase integration and safe linking of legacy accounts need complete end-to-end verification.
TV support: A remote-friendly Fire TV / Android TV experience is a development target. A verified native TV package and emulator/device demonstration are not claimed by this README.
Media licensing: The playable catalogue is a demonstration, not a commercial streaming library. Any expansion requires the appropriate distribution rights.
Offline playback: Depends on browser capabilities, storage, and allowed media sources; it should not be interpreted as DRM-enabled commercial offline viewing.
Deployment: Media-host configuration, CORS, environment variables, and external service quotas can affect functionality.
Built with a focus on connection
ONAHEYA is designed around more than simply pressing Play. It explores how shared reactions, conversations, meaningful moments, and community discovery can make screen-based entertainment feel less solitary.
Different places. Same room. ♡
---
Project
Developed by Lerato Sharmaine Mokgatla.  
GitHub: @sharmainelerato-glitch
Acknowledgments
TMDB for movie and TV metadata where used. ONAHEYA is not endorsed or certified by TMDB.
The open-source tools and services used to build the prototype.
import express from "express";
import cors from "cors";
import http from "node:http";
import { randomInt, randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const origins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowOrigin = (origin, callback) => {
  if (!origin || origins.includes(origin)) return callback(null, true);

  // Vite can choose another port if 5173 is already occupied.
  if (/^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin)) {
    return callback(null, true);
  }

  // Optional local-network testing only; enable with ALLOW_LAN=1.
  if (
    process.env.ALLOW_LAN === "1" &&
    /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:517\d$/.test(origin)
  ) {
    return callback(null, true);
  }

  console.warn("CORS blocked origin:", origin);
  return callback(new Error("Origin not allowed"));
};
app.use(cors({ origin: allowOrigin }));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
// Development-only persistent identity store. Keep data/accounts.json out of Git.
const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "accounts.json");
fs.mkdirSync(dataDir, { recursive: true });
let accountStore = { accounts: [], sessions: [] };
try {
  if (fs.existsSync(dataFile)) accountStore = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  if (!Array.isArray(accountStore.accounts) || !Array.isArray(accountStore.sessions)) throw Error("Invalid store");
} catch (error) { console.error("Account store error:", error.message); process.exit(1); }
const saveAccounts = () => {
  const temp = dataFile + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(accountStore, null, 2), { mode: 0o600 });
  fs.renameSync(temp, dataFile);
};
// Social relationships are keyed by persistent account IDs rather than display names.
if (!Array.isArray(accountStore.follows)) accountStore.follows = [];
if (!Array.isArray(accountStore.notifications)) accountStore.notifications = [];
const publicProfile = (a) => ({
  id: a.id, username: a.username, displayName: a.displayName, bio: a.bio || "",
  favoriteGenres: a.favoriteGenres || [], avatarUrl: a.avatarUrl || null,
  createdAt: a.createdAt,
  followersCount: accountStore.follows.filter(f => f.followingId === a.id).length,
  followingCount: accountStore.follows.filter(f => f.followerId === a.id).length,
});
const socialProfile = (a, viewerId) => ({
  ...publicProfile(a),
  isFollowing: accountStore.follows.some(f => f.followerId === viewerId && f.followingId === a.id),
  isSelf: viewerId === a.id,
});
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
function issueSession(a) {
  const token = randomBytes(32).toString("hex");
  accountStore.sessions.push({ hash: tokenHash(token), userId: a.id, createdAt: Date.now() });
  saveAccounts(); return token;
}
function authed(req, res, next) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(req.get("authorization") || "")?.[1];
  const session = token && accountStore.sessions.find(s => s.hash === tokenHash(token));
  const account = session && accountStore.accounts.find(a => a.id === session.userId);
  if (!account) return res.status(401).json({ error: "Please sign in." });
  req.account = account; req.sessionHash = session.hash; next();
}
app.use(express.json({ limit: "2mb" }));
app.post("/api/auth/register", (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  const password = req.body?.password;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: "Username: 3–20 lowercase letters, numbers or underscores." });
  if (displayName.length < 2 || displayName.length > 32) return res.status(400).json({ error: "Display name must be 2–32 characters." });
  if (typeof password !== "string" || password.length < 10 || password.length > 128) return res.status(400).json({ error: "Choose a password of 10–128 characters." });
  if (accountStore.accounts.some(a => a.username === username)) return res.status(409).json({ error: "That username is taken." });
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  const account = { id: randomUUID(), username, displayName, bio: "", favoriteGenres: [], salt, passwordHash, createdAt: new Date().toISOString() };
  accountStore.accounts.push(account);
  const token = issueSession(account);
  res.status(201).json({ token, profile: publicProfile(account) });
});
app.post("/api/auth/login", (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = req.body?.password;
  const account = accountStore.accounts.find(a => a.username === username);
  // Hash even for unknown usernames to reduce detectable timing differences.
  const salt = account?.salt || "00000000000000000000000000000000";
  const expected = Buffer.from(account?.passwordHash || "00".repeat(64), "hex");
  const actual = scryptSync(typeof password === "string" ? password.slice(0, 128) : "", salt, 64);
  if (!account || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: "Incorrect username or password." });
  res.json({ token: issueSession(account), profile: publicProfile(account) });
});
app.get("/api/me", authed, (req, res) => res.json({ profile: publicProfile(req.account) }));
app.patch("/api/me", authed, (req, res) => {
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : "";
  const genres = req.body?.favoriteGenres;
  if (displayName.length < 2 || displayName.length > 32 || bio.length > 160 || !Array.isArray(genres) || genres.length > 8 || !genres.every(g => typeof g === "string" && g.length >= 1 && g.length <= 25)) return res.status(400).json({ error: "Check display name, bio and genres." });
  req.account.displayName = displayName; req.account.bio = bio;
  req.account.favoriteGenres = genres.map(g => g.trim()).filter(Boolean);
  saveAccounts(); res.json({ profile: publicProfile(req.account) });
});
/* =========================================
   PROFILE PICTURE (LOCAL DEVELOPMENT)
   Small JPEG stored with the existing account.
========================================= */

app.patch("/api/me/avatar", authed, express.json({ limit: "450kb" }), (req, res) => {
  const avatarUrl = req.body?.avatarUrl;
  if (avatarUrl === null) {
    req.account.avatarUrl = null;
    saveAccounts();
    return res.json({ profile: publicProfile(req.account) });
  }
  if (typeof avatarUrl !== "string" ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(avatarUrl) ||
      avatarUrl.length > 350_000) {
    return res.status(400).json({ error: "Choose a valid profile photo smaller than 250 KB after processing." });
  }
  const raw = Buffer.from(avatarUrl.split(",")[1], "base64");
  if (raw.length < 4 || raw.length > 250_000 || raw[0] !== 0xff || raw[1] !== 0xd8 ||
      raw[raw.length-2] !== 0xff || raw[raw.length-1] !== 0xd9) {
    return res.status(400).json({ error: "Invalid JPEG profile picture." });
  }
  req.account.avatarUrl = avatarUrl;
  saveAccounts();
  return res.json({ profile: publicProfile(req.account) });
});


/* =========================================
   DISCOVER PEOPLE / FOLLOWING / NOTIFICATIONS
   Local prototype, authenticated routes only.
========================================= */
app.get("/api/people", authed, (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase().slice(0, 60) : "";
  const people = accountStore.accounts
    .filter(a => a.id !== req.account.id && (!search || a.username.includes(search) || a.displayName.toLowerCase().includes(search)))
    .slice(0, 50)
    .map(a => socialProfile(a, req.account.id));
  res.json({ people });
});
app.get("/api/people/:username", authed, (req, res) => {
  const a = accountStore.accounts.find(u => u.username === req.params.username.toLowerCase());
  if (!a) return res.status(404).json({ error: "Profile not found." });
  res.json({ profile: socialProfile(a, req.account.id) });
});
app.get("/api/people/:username/connections", authed, (req, res) => {
  const a = accountStore.accounts.find(u => u.username === req.params.username.toLowerCase());
  if (!a) return res.status(404).json({ error: "Profile not found." });
  const kind = req.query.type;
  if (kind !== "followers" && kind !== "following") return res.status(400).json({ error: "Invalid list type." });
  const ids = accountStore.follows.filter(f => kind === "followers" ? f.followingId === a.id : f.followerId === a.id)
    .map(f => kind === "followers" ? f.followerId : f.followingId);
  res.json({ people: ids.map(id => accountStore.accounts.find(u => u.id === id)).filter(Boolean).slice(0, 100).map(u => socialProfile(u, req.account.id)) });
});
app.post("/api/people/:username/follow", authed, (req, res) => {
  const target = accountStore.accounts.find(u => u.username === req.params.username.toLowerCase());
  if (!target) return res.status(404).json({ error: "Profile not found." });
  if (target.id === req.account.id) return res.status(400).json({ error: "You cannot follow yourself." });
  const exists = accountStore.follows.some(f => f.followerId === req.account.id && f.followingId === target.id);
  if (!exists) {
    accountStore.follows.push({ followerId: req.account.id, followingId: target.id, createdAt: Date.now() });
    accountStore.notifications.push({ id: randomUUID(), userId: target.id, type: "new_follower", actorId: req.account.id, createdAt: Date.now(), read: false });
    // Prevent unbounded growth in this development JSON store.
    accountStore.notifications = accountStore.notifications.slice(-2000);
    saveAccounts();
  }
  res.json({ profile: socialProfile(target, req.account.id) });
});
app.delete("/api/people/:username/follow", authed, (req, res) => {
  const target = accountStore.accounts.find(u => u.username === req.params.username.toLowerCase());
  if (!target) return res.status(404).json({ error: "Profile not found." });
  accountStore.follows = accountStore.follows.filter(f => !(f.followerId === req.account.id && f.followingId === target.id));
  saveAccounts();
  res.json({ profile: socialProfile(target, req.account.id) });
});
app.get("/api/notifications", authed, (req, res) => {
  const notifications = accountStore.notifications.filter(n => n.userId === req.account.id).slice(-60).reverse().map(n => {
    const actor = accountStore.accounts.find(a => a.id === n.actorId);
    return { id:n.id, type:n.type, createdAt:n.createdAt, read:n.read, actor: actor ? publicProfile(actor) : null };
  });
  res.json({ notifications, unreadCount: notifications.filter(n => !n.read).length });
});
app.post("/api/notifications/read", authed, (req, res) => {
  for (const n of accountStore.notifications) if (n.userId === req.account.id) n.read = true;
  saveAccounts();
  res.json({ ok:true });
});

app.post("/api/auth/logout", authed, (req, res) => {
  accountStore.sessions = accountStore.sessions.filter(s => s.hash !== req.sessionHash);
  saveAccounts(); res.json({ ok: true });
});

/* ONAHEYA — RECOMMENDATIONS & MOVIE DATES (local prototype) */
if (!Array.isArray(accountStore.recommendations)) accountStore.recommendations = [];
if (!Array.isArray(accountStore.movieDates)) accountStore.movieDates = [];
const authorCard = (id) => {
  const user = accountStore.accounts.find(a => a.id === id);
  return user ? { id:user.id, username:user.username, displayName:user.displayName, avatarUrl:user.avatarUrl || null } : null;
};

/* ONAHEYA — Movie & Series Catalogue (TMDB metadata, never playback) */
const catalogCache = new Map();
const catalogPoster = (p) => typeof p === "string" && /^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(p) ? p : null;
const formatCatalogItem = (item, type) => ({
  id: Number(item.id), type, kind: type === "tv" ? "Series" : "Movie",
  title: String(type === "tv" ? (item.name || "") : (item.title || "")).slice(0, 120),
  overview: String(item.overview || "").slice(0, 500),
  year: String((type === "tv" ? item.first_air_date : item.release_date) || "").slice(0, 4),
  posterPath: catalogPoster(item.poster_path),
  backdropPath: catalogPoster(item.backdrop_path),
  rating: Number.isFinite(item.vote_average) ? Math.round(item.vote_average * 10) / 10 : null,
});
async function getTmdb(route, params = {}) {
  const key = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!key) throw Object.assign(new Error("Add TMDB_READ_ACCESS_TOKEN to server/.env to enable the movie catalogue."), { status: 503 });
  const url = new URL(`https://api.themoviedb.org/3/${route}`);
  Object.entries({ language: "en-US", ...params }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const cacheKey = url.toString();
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error("Movie catalogue is temporarily unavailable."), { status: 502 });
    const data = await response.json();
    if (catalogCache.size > 250) catalogCache.clear();
    catalogCache.set(cacheKey, { at: Date.now(), data });
    return data;
  } finally { clearTimeout(timeout); }
}
app.get("/api/catalog", authed, async (req, res) => {
  const search = String(req.query.q || "").trim().slice(0, 90);
  const mode = req.query.kind === "Series" ? "tv" : req.query.kind === "Movie" ? "movie" : "all";
  const page = Math.max(1, Math.min(5, Number.parseInt(req.query.page, 10) || 1));
  try {
    let results = [];
    if (search) {
      if (mode === "all") {
        const data = await getTmdb("search/multi", { query: search, page, include_adult: false });
        results = (data.results || []).filter(x => x.media_type === "movie" || x.media_type === "tv").map(x => formatCatalogItem(x, x.media_type));
      } else {
        const data = await getTmdb(`search/${mode}`, { query: search, page, include_adult: false });
        results = (data.results || []).filter(x => !x.adult).map(x => formatCatalogItem(x, mode));
      }
    } else {
      const [movies, shows] = await Promise.all([
        getTmdb("trending/movie/week", { page }), getTmdb("trending/tv/week", { page })
      ]);
      results = [
        ...(movies.results || []).filter(x => !x.adult).slice(0, 10).map(x => formatCatalogItem(x, "movie")),
        ...(shows.results || []).filter(x => !x.adult).slice(0, 10).map(x => formatCatalogItem(x, "tv")),
      ];
      if (mode !== "all") results = results.filter(x => x.type === mode);
    }
    res.json({ results: results.filter(x => x.id > 0 && x.title), page, query: search });
  } catch (error) { res.status(error.status || 502).json({ error: error.message || "Catalogue unavailable." }); }
});
app.get("/api/catalog/lookup", authed, async (req, res) => {
  const title = String(req.query.title || "").trim().slice(0, 120);
  if (!title) return res.status(400).json({ error: "Title required" });
  const kind = req.query.kind === "Series" ? "tv" : "movie";
  try {
    const data = await getTmdb(`search/${kind}`, { query: title, page: 1, include_adult: false });
    const matching = (data.results || []).find(x => String(kind === "tv" ? x.name : x.title).toLowerCase() === title.toLowerCase()) || (data.results || [])[0];
    res.json({ result: matching ? formatCatalogItem(matching, kind) : null });
  } catch (error) { res.status(error.status || 502).json({ error: error.message || "Poster unavailable." }); }
});

if (!Array.isArray(accountStore.recommendationReactions)) accountStore.recommendationReactions = [];
if (!Array.isArray(accountStore.recommendationComments)) accountStore.recommendationComments = [];
const enrichRecommendation = (post, viewerId) => {
  const reactions = accountStore.recommendationReactions.filter(r=>r.postId===post.id);
  return {...post, author:authorCard(post.authorId), originalAuthor:post.originalAuthorId?authorCard(post.originalAuthorId):null, saved:accountStore.savedRecommendationIds?.some(x=>x.postId===post.id && x.userId===viewerId)||false, reactions:reactions.reduce((o,r)=>(o[r.emoji]=(o[r.emoji]||0)+1,o),{}), myReaction:reactions.find(r=>r.userId===viewerId)?.emoji||null, commentCount:accountStore.recommendationComments.filter(c=>c.postId===post.id).length};
};
app.post("/api/recommendations/:id/react",authed,(req,res)=>{
  if(!accountStore.recommendations.some(p=>p.id===req.params.id)) return res.status(404).json({error:"Recommendation not found."});
  const emoji=req.body?.emoji;
  if(!["❤️","😂","👏","🥹"].includes(emoji))return res.status(400).json({error:"Invalid reaction."});
  const existing=accountStore.recommendationReactions.find(r=>r.postId===req.params.id && r.userId===req.account.id);
  if(existing){if(existing.emoji===emoji)accountStore.recommendationReactions=accountStore.recommendationReactions.filter(r=>r!==existing);else existing.emoji=emoji;}
  else accountStore.recommendationReactions.push({postId:req.params.id,userId:req.account.id,emoji});
  saveAccounts();res.json({ok:true});
});
app.get("/api/recommendations/:id/comments",authed,(req,res)=>{
  if(!accountStore.recommendations.some(p=>p.id===req.params.id))return res.status(404).json({error:"Recommendation not found."});
  const comments=accountStore.recommendationComments.filter(c=>c.postId===req.params.id).slice(-100).map(c=>({...c,author:authorCard(c.userId)}));res.json({comments});
});
app.post("/api/recommendations/:id/comments",authed,(req,res)=>{
  if(!accountStore.recommendations.some(p=>p.id===req.params.id))return res.status(404).json({error:"Recommendation not found."});
  const text=typeof req.body?.text==="string"?req.body.text.trim():"";
  if(!text||text.length>500)return res.status(400).json({error:"Comment must be 1–500 characters."});
  const comment={id:randomUUID(),postId:req.params.id,userId:req.account.id,text,createdAt:Date.now()};
  accountStore.recommendationComments.push(comment);saveAccounts();res.status(201).json({comment:{...comment,author:authorCard(req.account.id)}});
});
// Social post actions: private saved posts, reposts, and account-to-account forwarding.
if (!Array.isArray(accountStore.savedRecommendationIds)) accountStore.savedRecommendationIds = [];
if (!Array.isArray(accountStore.forwardedRecommendations)) accountStore.forwardedRecommendations = [];
app.get("/api/recommendations/saved", authed, (req,res) => {
  const ids = accountStore.savedRecommendationIds.filter(x=>x.userId===req.account.id).map(x=>x.postId);
  res.json({posts:ids.map(id=>accountStore.recommendations.find(p=>p.id===id)).filter(Boolean).map(p=>enrichRecommendation(p,req.account.id))});
});
app.post("/api/recommendations/:id/save",authed,(req,res)=>{
  const post=accountStore.recommendations.find(p=>p.id===req.params.id);
  if(!post)return res.status(404).json({error:"Post not found."});
  const ix=accountStore.savedRecommendationIds.findIndex(x=>x.postId===post.id&&x.userId===req.account.id);
  if(ix>=0)accountStore.savedRecommendationIds.splice(ix,1);
  else accountStore.savedRecommendationIds.push({postId:post.id,userId:req.account.id,createdAt:Date.now()});
  saveAccounts();res.json({saved:ix<0});
});
app.post("/api/recommendations/:id/repost",authed,(req,res)=>{
  const original=accountStore.recommendations.find(p=>p.id===req.params.id);
  if(!original)return res.status(404).json({error:"Post not found."});
  const root=accountStore.recommendations.find(p=>p.id===(original.repostOf||original.id))||original;
  if(root.authorId===req.account.id)return res.status(400).json({error:"You already own this original post."});
  if(accountStore.recommendations.some(p=>p.repostOf===root.id&&p.authorId===req.account.id))return res.status(409).json({error:"You already reposted this recommendation."});
  const post={id:randomUUID(),authorId:req.account.id,title:root.title,review:root.review,kind:root.kind,recommend:root.recommend,spoiler:root.spoiler,posterPath:root.posterPath||null,tmdbId:root.tmdbId||null,repostOf:root.id,originalAuthorId:root.authorId,createdAt:Date.now()};
  accountStore.recommendations.push(post);saveAccounts();res.status(201).json({post:enrichRecommendation(post,req.account.id)});
});
app.post("/api/recommendations/:id/forward",authed,(req,res)=>{
  const post=accountStore.recommendations.find(p=>p.id===req.params.id);
  if(!post)return res.status(404).json({error:"Post not found."});
  const username=String(req.body?.username||"").trim().replace(/^@/,"").toLowerCase();
  const recipient=accountStore.accounts.find(a=>a.username===username);
  if(!recipient)return res.status(404).json({error:"Recipient username was not found."});
  if(recipient.id===req.account.id)return res.status(400).json({error:"Choose another person."});
  const item={id:randomUUID(),postId:post.id,fromId:req.account.id,toId:recipient.id,createdAt:Date.now()};
  accountStore.forwardedRecommendations.push(item);
  accountStore.forwardedRecommendations=accountStore.forwardedRecommendations.slice(-3000);
  accountStore.notifications.push({id:randomUUID(),userId:recipient.id,type:"recommendation_forward",actorId:req.account.id,createdAt:Date.now(),read:false});
  saveAccounts();res.status(201).json({ok:true});
});
app.get("/api/recommendations/forwarded",authed,(req,res)=>{
  const forwards=accountStore.forwardedRecommendations.filter(x=>x.toId===req.account.id).slice(-100).reverse().map(f=>({id:f.id,from:authorCard(f.fromId),createdAt:f.createdAt,post:accountStore.recommendations.find(p=>p.id===f.postId)})).filter(f=>f.post).map(f=>({...f,post:enrichRecommendation(f.post,req.account.id)}));
  res.json({forwards});
});
app.get("/api/recommendations", authed, (req, res) => {
  const username = String(req.query.username || "").trim().toLowerCase();
  const owner = username ? accountStore.accounts.find(a => a.username === username) : null;
  if (username && !owner) return res.status(404).json({ error:"Profile not found." });
  const posts = accountStore.recommendations
    .filter(post => !owner || post.authorId === owner.id)
    .slice(-100).reverse().map(post => enrichRecommendation(post,req.account.id));
  res.json({ posts });
});
app.post("/api/recommendations", authed, (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const review = typeof req.body?.review === "string" ? req.body.review.trim() : "";
  const kind = req.body?.kind === "Series" ? "Series" : "Movie";
  const recommend = req.body?.recommend === true;
  const spoiler = req.body?.spoiler === true;
  if (!title || title.length > 120 || !review || review.length > 1000)
    return res.status(400).json({error:"Enter a title (up to 120 characters) and review (up to 1000 characters)."});
  const posterPath = catalogPoster(req.body?.posterPath);
  const tmdbId = Number.isSafeInteger(req.body?.tmdbId) && req.body.tmdbId > 0 ? req.body.tmdbId : null;
  const post = { id:randomUUID(), authorId:req.account.id, title, kind, review, recommend, spoiler, posterPath, tmdbId, createdAt:Date.now() };
  accountStore.recommendations.push(post);
  accountStore.recommendations = accountStore.recommendations.slice(-3000);
  saveAccounts(); res.status(201).json({post:{...post, author:authorCard(post.authorId)}});
});
app.delete("/api/recommendations/:id", authed, (req, res) => {
  const post = accountStore.recommendations.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({error:"Post not found."});
  if (post.authorId !== req.account.id) return res.status(403).json({error:"Only the author can delete this post."});
  accountStore.recommendations = accountStore.recommendations.filter(p => p.id !== post.id);
  accountStore.recommendationReactions=accountStore.recommendationReactions.filter(r=>r.postId!==post.id);
  accountStore.recommendationComments=accountStore.recommendationComments.filter(c=>c.postId!==post.id);
  saveAccounts(); res.json({ok:true});
});
app.get("/api/movie-dates", authed, (req, res) => {
  const dates = accountStore.movieDates.filter(d => d.hostId === req.account.id || d.inviteeIds.includes(req.account.id))
    .sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).map(d => ({...d,
      roomCode: (d.hostId === req.account.id || d.responses[req.account.id] === "accepted") && rooms.has(d.roomCode) ? d.roomCode : null,
      host:authorCard(d.hostId), invitees:d.inviteeIds.map(id=>({user:authorCard(id),status:d.responses[id] || "pending"}))}));
  res.json({dates});
});
app.post("/api/movie-dates", authed, (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const startsAt = req.body?.startsAt;
  const mood = ["Cozy","Sunset","Rainy","Late Night","Romance"].includes(req.body?.mood) ? req.body.mood : "Cozy";
  const usernames = Array.isArray(req.body?.usernames) ? req.body.usernames : [];
  if (!title || title.length > 120 || typeof startsAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(startsAt) || !Number.isFinite(Date.parse(startsAt)) || Date.parse(startsAt) < Date.now() || usernames.length < 1 || usernames.length > 12)
    return res.status(400).json({error:"Choose a title, future date and 1–12 invitees."});
  // Normalize handles, including pasted @usernames, before looking up accounts.
  const handles = usernames.map(name => String(name).trim().replace(/^@/, "").toLowerCase());
  const invitees = handles.map(username =>
    accountStore.accounts.find(account => account.username === username)
  );

  const missingUsernames = handles.filter((username, index) => !invitees[index]);
  if (missingUsernames.length > 0) {
    return res.status(400).json({
      error: `These usernames were not found: ${[...new Set(missingUsernames)].map(name => `@${name}`).join(", ")}. Please use exact usernames, not display names.`,
    });
  }

  if (invitees.some(account => account.id === req.account.id)) {
    return res.status(400).json({
      error: "You cannot invite your own account to a movie date.",
    });
  }
  const inviteeIds = [...new Set(invitees.map(u=>u.id))];
  const responses = Object.fromEntries(inviteeIds.map(id=>[id,"pending"]));
  const date = {id:randomUUID(),hostId:req.account.id,inviteeIds,responses,title,mood,startsAt,createdAt:Date.now()};
  accountStore.movieDates.push(date);
  for (const id of inviteeIds) accountStore.notifications.push({id:randomUUID(),userId:id,type:"movie_date_invite",actorId:req.account.id,createdAt:Date.now(),read:false});
  accountStore.notifications = accountStore.notifications.slice(-3000);
  saveAccounts(); res.status(201).json({date});
});
// Only the date host can attach the live code; only accepted invitees can view it.
app.post("/api/movie-dates/:id/room", authed, (req, res) => {
  const date = accountStore.movieDates.find(d => d.id === req.params.id);
  if (!date) return res.status(404).json({error:"Movie date not found."});
  if (date.hostId !== req.account.id) return res.status(403).json({error:"Only the host can open this watch room."});
  const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
  const active = rooms.get(code);
  if (!active || active.hostName !== req.account.displayName || active.name !== date.title)
    return res.status(400).json({error:"Open your movie date's live room first."});
  date.roomCode = code;
  saveAccounts();
  res.json({ok:true, code});
});
app.post("/api/movie-dates/:id/respond", authed, (req, res) => {
  const date=accountStore.movieDates.find(d=>d.id===req.params.id);
  if (!date) return res.status(404).json({error:"Invitation not found."});
  if (!date.inviteeIds.includes(req.account.id)) return res.status(403).json({error:"Not invited."});
  if (typeof req.body?.accept !== "boolean") return res.status(400).json({error:"Choose accept or decline."});
  date.responses[req.account.id]=req.body.accept?"accepted":"declined";
  accountStore.notifications.push({id:randomUUID(),userId:date.hostId,type:"movie_date_response",actorId:req.account.id,createdAt:Date.now(),read:false});
  saveAccounts();res.json({ok:true});
});

/* =========================================
   PERSISTENT ACCOUNT MESSAGES — local MVP
   A DM requires both people to follow one another.
   Group invitations require acceptance; membership
   never grants access to a private watch party.
========================================= */
if (!Array.isArray(accountStore.conversations)) accountStore.conversations = [];
if (!Array.isArray(accountStore.socialMessages)) accountStore.socialMessages = [];

const memberOf = (conversation, userId) => conversation.members.includes(userId);
const mutualFollow = (a, b) =>
  accountStore.follows.some(f => f.followerId === a && f.followingId === b) &&
  accountStore.follows.some(f => f.followerId === b && f.followingId === a);
const lookupUser = username => accountStore.accounts.find(a => a.username === String(username || "").trim().toLowerCase());
const userCard = (id) => {
  const person = accountStore.accounts.find(a => a.id === id);
  return person ? { id: person.id, username: person.username, displayName: person.displayName, avatarUrl: person.avatarUrl || null } : null;
};
const convoCard = (conversation, viewerId) => ({
  id: conversation.id, type: conversation.type, name: conversation.name,
  creatorId: conversation.creatorId,
  members: conversation.members.map(userCard).filter(Boolean),
  invited: conversation.invited.includes(viewerId),
  pending: conversation.invited.map(userCard).filter(Boolean),
  lastMessage: accountStore.socialMessages.filter(m => m.conversationId === conversation.id).slice(-1)[0] || null,
  createdAt: conversation.createdAt,
});

app.get("/api/messages/conversations", authed, (req, res) => {
  const list = accountStore.conversations
    .filter(c => memberOf(c, req.account.id) || c.invited.includes(req.account.id))
    .map(c => convoCard(c, req.account.id))
    .sort((a,b) => (b.lastMessage?.createdAt || b.createdAt) - (a.lastMessage?.createdAt || a.createdAt));
  res.json({ conversations: list });
});

app.post("/api/messages/direct", authed, (req, res) => {
  const other = lookupUser(req.body?.username);
  if (!other || other.id === req.account.id) return res.status(404).json({ error: "Choose another existing account." });
  if (!mutualFollow(req.account.id, other.id)) return res.status(403).json({ error: "You must follow each other before starting a private conversation." });
  let convo = accountStore.conversations.find(c => c.type === "direct" && c.members.includes(req.account.id) && c.members.includes(other.id));
  if (!convo) {
    convo = { id: randomUUID(), type: "direct", name: "", creatorId: req.account.id, members: [req.account.id, other.id], invited: [], createdAt: Date.now() };
    accountStore.conversations.push(convo); saveAccounts();
  }
  res.json({ conversation: convoCard(convo, req.account.id) });
});

app.post("/api/messages/groups", authed, (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const usernames = req.body?.usernames;
  if (name.length < 2 || name.length > 60 || !Array.isArray(usernames) || usernames.length > 15) return res.status(400).json({ error: "Enter a group name (2–60 characters) and up to 15 invites." });
  const invited = [];
  for (const username of usernames) {
    const person = lookupUser(username);
    if (!person) return res.status(404).json({ error: `Account @${String(username).slice(0,30)} not found.` });
    if (person.id !== req.account.id && !invited.includes(person.id)) invited.push(person.id);
  }
  const convo = { id: randomUUID(), type: "group", name, creatorId: req.account.id, members: [req.account.id], invited, createdAt: Date.now() };
  accountStore.conversations.push(convo); saveAccounts();
  res.status(201).json({ conversation: convoCard(convo, req.account.id) });
});

app.post("/api/messages/:id/invite", authed, (req, res) => {
  const convo = accountStore.conversations.find(c => c.id === req.params.id);
  if (!convo || convo.type !== "group" || !memberOf(convo, req.account.id)) return res.status(403).json({ error: "Only current group members can invite people." });
  const other = lookupUser(req.body?.username);
  if (!other) return res.status(404).json({ error: "Account not found." });
  if (convo.members.includes(other.id) || convo.invited.includes(other.id)) return res.status(409).json({ error: "Already a member or invited." });
  if (convo.members.length + convo.invited.length >= 30) return res.status(400).json({ error: "Group capacity reached." });
  convo.invited.push(other.id); saveAccounts();
  res.json({ conversation: convoCard(convo, req.account.id) });
});

app.post("/api/messages/:id/respond", authed, (req, res) => {
  const convo = accountStore.conversations.find(c => c.id === req.params.id);
  if (!convo || !convo.invited.includes(req.account.id)) return res.status(404).json({ error: "No invitation found." });
  if (typeof req.body?.accept !== "boolean") return res.status(400).json({ error: "Choose accept or decline." });
  convo.invited = convo.invited.filter(id => id !== req.account.id);
  if (req.body.accept) convo.members.push(req.account.id);
  saveAccounts(); res.json({ ok: true });
});

app.get("/api/messages/:id", authed, (req, res) => {
  const convo = accountStore.conversations.find(c => c.id === req.params.id);
  if (!convo || !memberOf(convo, req.account.id)) return res.status(403).json({ error: "You are not a member of this conversation." });
  const messages = accountStore.socialMessages.filter(m => m.conversationId === convo.id).slice(-100).map(m => ({ ...m, sender: userCard(m.senderId) }));
  res.json({ conversation: convoCard(convo, req.account.id), messages });
});

app.post("/api/messages/:id", authed, (req, res) => {
  const convo = accountStore.conversations.find(c => c.id === req.params.id);
  if (!convo || !memberOf(convo, req.account.id)) return res.status(403).json({ error: "You are not a member of this conversation." });
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1200) return res.status(400).json({ error: "Messages must contain 1–1200 characters." });
  if (convo.type === "direct" && !mutualFollow(convo.members[0], convo.members[1])) return res.status(403).json({ error: "You must still mutually follow to message." });
  const message = { id: randomUUID(), conversationId: convo.id, senderId: req.account.id, text, createdAt: Date.now() };
  accountStore.socialMessages.push(message);
  // Limit local JSON growth to prevent unbounded storage.
  if (accountStore.socialMessages.length > 20000) accountStore.socialMessages.splice(0, accountStore.socialMessages.length - 20000);
  saveAccounts(); res.status(201).json({ message: { ...message, sender: userCard(message.senderId) } });
});

app.post("/api/messages/:id/leave", authed, (req, res) => {
  const convo = accountStore.conversations.find(c => c.id === req.params.id);
  if (!convo || convo.type !== "group" || !memberOf(convo, req.account.id)) return res.status(403).json({ error: "Not a group member." });
  convo.members = convo.members.filter(id => id !== req.account.id);
  if (convo.creatorId === req.account.id && convo.members.length) convo.creatorId = convo.members[0];
  if (!convo.members.length) {
    accountStore.conversations = accountStore.conversations.filter(c => c.id !== convo.id);
    accountStore.socialMessages = accountStore.socialMessages.filter(m => m.conversationId !== convo.id);
  }
  saveAccounts(); res.json({ ok: true });
});


/* ONAHEYA Story Social — persistent prototype data with account permissions. */
if (!Array.isArray(accountStore.storyDiscussions)) accountStore.storyDiscussions = [];
if (!Array.isArray(accountStore.sharedWatchlists)) accountStore.sharedWatchlists = [];
const storyIds = new Set(["alice-wonderland"]);
const playableIds = new Set(["big-buck-bunny","sintel","tears-of-steel","alice-1903","spring"]);
const listView = (list) => ({ ...list, members: list.memberIds.map(authorCard).filter(Boolean), owner: authorCard(list.ownerId) });

app.get("/api/stories/:id/discussion", authed, (req,res) => {
  if (!storyIds.has(req.params.id)) return res.status(404).json({error:"Book not found."});
  const messages = accountStore.storyDiscussions.filter(d => d.bookId === req.params.id).slice(-120)
    .map(d => ({...d, author:authorCard(d.authorId)}));
  res.json({messages});
});
app.post("/api/stories/:id/discussion", authed, (req,res) => {
  if (!storyIds.has(req.params.id)) return res.status(404).json({error:"Book not found."});
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const chapter = Number(req.body?.chapter);
  if (!text || text.length > 1200 || !Number.isInteger(chapter) || chapter < 1 || chapter > 12)
    return res.status(400).json({error:"Write a message (1–1200 characters) and select a chapter (1–12)."});
  const message = {id:randomUUID(),bookId:req.params.id,authorId:req.account.id,text,chapter,
    spoiler:req.body?.spoiler === true, createdAt:Date.now()};
  accountStore.storyDiscussions.push(message);
  accountStore.storyDiscussions = accountStore.storyDiscussions.slice(-4000);
  saveAccounts(); res.status(201).json({message:{...message,author:authorCard(message.authorId)}});
});
app.delete("/api/stories/:id/discussion/:messageId", authed, (req,res) => {
  const message = accountStore.storyDiscussions.find(m=>m.bookId===req.params.id && m.id===req.params.messageId);
  if (!message) return res.status(404).json({error:"Discussion not found."});
  if (message.authorId !== req.account.id) return res.status(403).json({error:"Only the author can delete their comment."});
  accountStore.storyDiscussions = accountStore.storyDiscussions.filter(m=>m.id!==message.id);
  saveAccounts();res.json({ok:true});
});
app.get("/api/watchlists", authed, (req,res) => {
  res.json({lists:accountStore.sharedWatchlists.filter(l=>l.memberIds.includes(req.account.id)).map(listView)});
});
app.post("/api/watchlists", authed, (req,res) => {
  const name=typeof req.body?.name==="string"?req.body.name.trim():"";
  const names=Array.isArray(req.body?.usernames)?req.body.usernames:[];
  if (name.length<2 || name.length>60 || names.length>12 || names.some(n=>typeof n!=="string"))
    return res.status(400).json({error:"Choose a name (2–60 characters) and up to 12 usernames."});
  const normalized=names.map(n=>n.trim().replace(/^@/,"").toLowerCase()).filter(Boolean);
  const people=normalized.map(username=>accountStore.accounts.find(a=>a.username===username));
  if (people.some(p=>!p)) return res.status(400).json({error:"Unknown usernames: "+normalized.filter((_,i)=>!people[i]).join(", ")});
  const list={id:randomUUID(),name,ownerId:req.account.id,memberIds:[...new Set([req.account.id,...people.map(a=>a.id)])],
    items:[],createdAt:Date.now()};
  accountStore.sharedWatchlists.push(list);saveAccounts();res.status(201).json({list:listView(list)});
});
app.post("/api/watchlists/:id/items",authed,(req,res)=>{
  const list=accountStore.sharedWatchlists.find(l=>l.id===req.params.id);
  if(!list || !list.memberIds.includes(req.account.id))return res.status(404).json({error:"Watchlist not found."});
  const filmId=typeof req.body?.filmId==="string"?req.body.filmId:"";
  if(!playableIds.has(filmId))return res.status(400).json({error:"Choose a playable demo film."});
  if(!list.items.some(i=>i.filmId===filmId))list.items.push({filmId,addedBy:req.account.id,createdAt:Date.now()});
  saveAccounts();res.json({list:listView(list)});
});
app.delete("/api/watchlists/:id/items/:filmId",authed,(req,res)=>{
  const list=accountStore.sharedWatchlists.find(l=>l.id===req.params.id);
  if(!list || !list.memberIds.includes(req.account.id))return res.status(404).json({error:"Watchlist not found."});
  list.items=list.items.filter(i=>i.filmId!==req.params.filmId);
  saveAccounts();res.json({list:listView(list)});
});
app.delete("/api/watchlists/:id",authed,(req,res)=>{
  const list=accountStore.sharedWatchlists.find(l=>l.id===req.params.id);
  if(!list)return res.status(404).json({error:"Watchlist not found."});
  if(list.ownerId!==req.account.id)return res.status(403).json({error:"Only the creator can delete this watchlist."});
  accountStore.sharedWatchlists=accountStore.sharedWatchlists.filter(l=>l.id!==list.id);
  saveAccounts();res.json({ok:true});
});

const io = new Server(server, { cors: { origin: allowOrigin, methods: ["GET", "POST"] }, maxHttpBufferSize: 25_000 });
const rooms = new Map();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const validMood = new Set(["Cozy", "Sunset", "Rainy", "Late Night", "Romance"]);
const clean = (v, max = 80) => typeof v === "string" ? v.trim().slice(0, max) : "";
const codeOf = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const currentTime = (room) => room.playing
  ? Math.max(0, room.position + (Date.now() - room.updatedAt) / 1000)
  : room.position;
const demoVideoIds = new Set(["big-buck-bunny","sintel","tears-of-steel","spring"]);
const roomDetails = (room) => ({
  code: room.code, name: room.name, mood: room.mood, privacy: room.privacy,
  videoId: room.videoId || "big-buck-bunny",
  hostId: room.hostId, hostName: room.hostName,
  participants: Array.from(room.participants, ([id, data]) => ({ id, name: data.name, host: id === room.hostId })),
  playback: { playing: room.playing, position: currentTime(room), updatedAt: Date.now() },
  messages: room.messages.slice(-60),
  allowPrivateMessages: room.allowPrivateMessages,
  sharedMoments: room.sharedMoments || [],
});
function leave(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  delete socket.data.roomCode;
  if (!room) return;
  room.participants.delete(socket.id);
  if (room.hostId === socket.id) {
    const next = room.participants.entries().next().value;
    if (next) {
      room.hostId = next[0]; room.hostName = next[1].name;
    } else {
      rooms.delete(code);
      return;
    }
  }
  io.to(code).emit("room:update", roomDetails(room));
}
function callback(reply, payload) { if (typeof reply === "function") reply(payload); }

io.on("connection", (socket) => {
  socket.on("room:create", (input = {}, reply) => {
    const name = clean(input.name, 50);
    const person = clean(input.nickname, 32);
    if (!person) return callback(reply, { ok: false, error: "Enter your display name." });
    if (!name) return callback(reply, { ok: false, error: "Enter a room name." });
    leave(socket);
    let code; do { code = codeOf(); } while (rooms.has(code));
    const room = {
      code, name, mood: validMood.has(input.mood) ? input.mood : "Cozy",
      videoId: demoVideoIds.has(input.videoId) ? input.videoId : "big-buck-bunny",
      privacy: input.privacy === "Public" ? "Public" : "Private",
      hostId: socket.id, hostName: person,
      position: 0, playing: false, updatedAt: Date.now(),
      participants: new Map([[socket.id, { name: person }]]), messages: [],
      allowPrivateMessages: true, sharedMoments: [],
    };
    rooms.set(code, room);
    socket.join(code); socket.data.roomCode = code;
    callback(reply, { ok: true, room: roomDetails(room), myId: socket.id });
  });

  socket.on("room:join", (input = {}, reply) => {
    const code = clean(input.code, 6).toUpperCase();
    const room = rooms.get(code);
    if (!room) return callback(reply, { ok: false, error: "Room not found or no longer active. Ask the host to open it." });
    const nickname = clean(input.nickname, 32);
    if (!nickname) return callback(reply, { ok: false, error: "Enter your display name." });
    if (socket.data.roomCode !== code) leave(socket);
    socket.join(code); socket.data.roomCode = code;
    room.participants.set(socket.id, { name: nickname });
    callback(reply, { ok: true, room: roomDetails(room), myId: socket.id });
    io.to(code).emit("room:update", roomDetails(room));
  });

  socket.on("room:leave", (_unused, reply) => {
    leave(socket); callback(reply, { ok: true });
  });

  socket.on("chat:send", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    const sender = room?.participants.get(socket.id);
    const content = clean(input.text, 500);
    if (!room || !sender || !content) return callback(reply, { ok: false, error: "Cannot send this message." });
    const msg = { id: randomUUID(), author: sender.name, senderId: socket.id, text: content, kind: input.kind === "reaction" ? "reaction" : "message", at: Date.now() };
    room.messages.push(msg); if (room.messages.length > 100) room.messages.shift();
    io.to(room.code).emit("chat:message", msg);
    callback(reply, { ok: true });
  });

  // Only the current room host can change whether direct messaging is allowed.
  // This is checked server-side, not merely hidden in the interface.
  socket.on("room:private-setting", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) {
      return callback(reply, { ok: false, error: "Only the room host can change messaging permissions." });
    }
    if (typeof input.enabled !== "boolean") {
      return callback(reply, { ok: false, error: "Invalid messaging setting." });
    }
    room.allowPrivateMessages = input.enabled;
    io.to(room.code).emit("room:update", roomDetails(room));
    callback(reply, { ok: true });
  });

  // A private message is emitted ONLY to the sender and the intended recipient.
  // Never add it to room.messages or broadcast it through room:update.
  socket.on("private:send", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    const sender = room?.participants.get(socket.id);
    const recipientId = typeof input.recipientId === "string" ? input.recipientId : "";
    const recipient = room?.participants.get(recipientId);
    const content = clean(input.text, 500);
    if (!room || !sender) {
      return callback(reply, { ok: false, error: "Join the room before messaging." });
    }
    if (!room.allowPrivateMessages) {
      return callback(reply, { ok: false, error: "The host has disabled private messaging." });
    }
    if (!recipient || recipientId === socket.id) {
      return callback(reply, { ok: false, error: "That participant is no longer available." });
    }
    if (!content) {
      return callback(reply, { ok: false, error: "Write a message first." });
    }
    const message = {
      id: randomUUID(), senderId: socket.id, senderName: sender.name,
      recipientId, recipientName: recipient.name, text: content, at: Date.now(),
    };
    io.to(socket.id).emit("private:message", message);
    io.to(recipientId).emit("private:message", message);
    callback(reply, { ok: true });
  });

  // Moment Capsules: explicitly shared memories, transient for the active room.
  // Private messages and personal notes are never read from or published by the server.
  socket.on("moment:share", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    const sender = room?.participants.get(socket.id);
    if (!room || !sender) return callback(reply, { ok: false, error: "Join a room before sharing." });
    const text = typeof input.text === "string" ? input.text.trim() : "";
    const position = Number(input.position);
    if (!text || text.length > 240 || !Number.isFinite(position) || position < 0 || position > 100000) {
      return callback(reply, { ok: false, error: "Choose a short moment to share." });
    }
    const now = Date.now();
    if (now - (socket.data.lastMomentAt || 0) < 2500) return callback(reply, { ok: false, error: "Wait a moment before sharing again." });
    socket.data.lastMomentAt = now;
    const moment = { id: randomUUID(), author: sender.name, text, position, at: now };
    if (!Array.isArray(room.sharedMoments)) room.sharedMoments = [];
    room.sharedMoments.push(moment);
    room.sharedMoments = room.sharedMoments.slice(-30);
    io.to(room.code).emit("moment:shared", moment);
    callback(reply, { ok: true, moment });
  });

  // TapTap: discreet, ephemeral one-to-one gestures, separate from chat.
  socket.on("taptap:mute", (input = {}, reply) => {
    if (typeof input.muted !== "boolean") return callback(reply, { ok: false, error: "Invalid mute setting." });
    socket.data.tapsMuted = input.muted;
    callback(reply, { ok: true, muted: input.muted });
  });

  socket.on("taptap:send", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    const sender = room?.participants.get(socket.id);
    const recipientId = typeof input.recipientId === "string" ? input.recipientId : "";
    const recipient = room?.participants.get(recipientId);
    const gestures = { heart: "♡", squeeze: "🤝", here: "✨" };
    const gesture = typeof input.gesture === "string" ? input.gesture : "";
    if (!room || !sender || !recipient || recipientId === socket.id || !(gesture in gestures)) {
      return callback(reply, { ok: false, error: "Choose another participant and a valid gesture." });
    }
    const now = Date.now();
    if (now - (socket.data.lastTapAt || 0) < 1500) {
      return callback(reply, { ok: false, error: "Give your taps a little breathing room ♡" });
    }
    socket.data.lastTapAt = now;
    const recipientSocket = io.sockets.sockets.get(recipientId);
    if (!recipientSocket || recipientSocket.data.tapsMuted === true) {
      return callback(reply, { ok: false, error: "This participant is not receiving taps." });
    }
    recipientSocket.emit("taptap:receive", {
      id: randomUUID(), senderId: socket.id, senderName: sender.name,
      gesture, symbol: gestures[gesture], at: now,
    });
    callback(reply, { ok: true });
  });

  socket.on("playback:set", (input = {}, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return callback(reply, { ok: false, error: "Only the current host can control playback." });
    const position = Number(input.position);
    if (!Number.isFinite(position) || position < 0 || position > 100_000)
      return callback(reply, { ok: false, error: "Invalid playback position." });
    room.position = position; room.playing = Boolean(input.playing); room.updatedAt = Date.now();
    const playback = { position: room.position, playing: room.playing, updatedAt: room.updatedAt };
    io.to(room.code).emit("playback:update", playback);
    callback(reply, { ok: true });
  });

  socket.on("disconnect", () => leave(socket));
});

// Drift correction: guests gently follow authoritative host time once every five seconds.
setInterval(() => {
  for (const room of rooms.values()) {
    io.to(room.code).emit("playback:sync", { position: currentTime(room), playing: room.playing, updatedAt: Date.now() });
  }
}, 5000).unref();


/* Story Circles: discussions and watch-next polls linked to a catalogue film ID. */
if (!Array.isArray(accountStore.storyCirclePosts)) accountStore.storyCirclePosts = [];
if (!Array.isArray(accountStore.storyCircleVotes)) accountStore.storyCircleVotes = [];
const circleKey = value => typeof value === "string" && /^[a-z0-9-]{1,70}$/.test(value);
app.get("/api/story-circles/:filmId", authed, (req,res)=>{
  if (!circleKey(req.params.filmId)) return res.status(400).json({error:"Invalid film ID"});
  const posts=accountStore.storyCirclePosts.filter(p=>p.filmId===req.params.filmId).slice(-100).reverse().map(p=>({ ...p,author:authorCard(p.authorId),likes:(p.likes||[]).length,liked:(p.likes||[]).includes(req.account.id) }));
  res.json({posts});
});
app.post("/api/story-circles/:filmId", authed, (req,res)=>{
  const filmId=req.params.filmId, body=typeof req.body?.body==="string"?req.body.body.trim():"";
  if (!circleKey(filmId)||body.length<1||body.length>1200) return res.status(400).json({error:"Write a discussion of 1–1200 characters."});
  const post={id:randomUUID(),filmId,authorId:req.account.id,body,spoiler:req.body?.spoiler===true,createdAt:Date.now(),likes:[]};
  accountStore.storyCirclePosts.push(post); accountStore.storyCirclePosts=accountStore.storyCirclePosts.slice(-5000);saveAccounts();res.status(201).json({post});
});
app.post("/api/story-circles/:filmId/:postId/like", authed,(req,res)=>{
  const post=accountStore.storyCirclePosts.find(p=>p.id===req.params.postId&&p.filmId===req.params.filmId);
  if(!post)return res.status(404).json({error:"Discussion not found"});
  post.likes ||= [];post.likes=post.likes.includes(req.account.id)?post.likes.filter(id=>id!==req.account.id):[...post.likes,req.account.id];saveAccounts();res.json({likes:post.likes.length,liked:post.likes.includes(req.account.id)});
});
app.get("/api/story-next/:roomCode",authed,(req,res)=>{
  const roomCode=String(req.params.roomCode).toUpperCase();
  const votes=accountStore.storyCircleVotes.filter(v=>v.roomCode===roomCode);
  const counts={};for(const v of votes)counts[v.filmId]=(counts[v.filmId]||0)+1;
  res.json({counts,myVote:votes.find(v=>v.userId===req.account.id)?.filmId||null});
});
app.post("/api/story-next/:roomCode",authed,(req,res)=>{
  const roomCode=String(req.params.roomCode).toUpperCase(),filmId=req.body?.filmId;
  if(!/^[A-Z0-9]{6}$/.test(roomCode)||!circleKey(filmId))return res.status(400).json({error:"Invalid room or film."});
  accountStore.storyCircleVotes=accountStore.storyCircleVotes.filter(v=>!(v.roomCode===roomCode&&v.userId===req.account.id));
  accountStore.storyCircleVotes.push({roomCode,userId:req.account.id,filmId,createdAt:Date.now()});saveAccounts();res.json({ok:true});
});


/* ONAHEYA Guide: aggregate real social activity only; no invented viewers. */
app.get("/api/guide/insights", authed, (_req, res) => {
  const counts = new Map();
  const add = (title, key, value = 1) => {
    const t = String(title || "").trim().slice(0, 120);
    if (!t) return;
    const id = t.toLocaleLowerCase();
    if (!counts.has(id)) counts.set(id, { title: t, discussions: 0, likes: 0, recommendations: 0, positiveRecommendations: 0 });
    counts.get(id)[key] += value;
  };
  const filmNames = { "big-buck-bunny": "Big Buck Bunny", "sintel": "Sintel", "tears-of-steel": "Tears of Steel", "spring": "Spring", "alice-1903": "Alice in Wonderland" };
  for (const p of accountStore.storyCirclePosts || []) {
    const title = filmNames[p.filmId];
    if (!title) continue;
    add(title, "discussions");
    add(title, "likes", Array.isArray(p.likes) ? p.likes.length : 0);
  }
  for (const p of accountStore.recommendations || []) {
    if (p.repostOf) continue;
    add(p.title, "recommendations");
    if (p.recommend === true) add(p.title, "positiveRecommendations");
    add(p.title, "likes", (accountStore.recommendationReactions || []).filter(r => r.postId === p.id && r.emoji === "❤️").length);
  }
  const items = [...counts.values()];
  res.json({
    mostDiscussed: [...items].filter(x=>x.discussions).sort((a,b)=>b.discussions-a.discussions).slice(0,5),
    mostLiked: [...items].filter(x=>x.likes).sort((a,b)=>b.likes-a.likes).slice(0,5),
    mostRecommended: [...items].filter(x=>x.positiveRecommendations).sort((a,b)=>b.positiveRecommendations-a.positiveRecommendations).slice(0,5),
    watchDataAvailable: false,
    updatedAt: new Date().toISOString()
  });
});


/* Groq-powered ONAHEYA Guide: account-authenticated and key stays server-side. */
const GUIDE_PAGES = ["home","browse","community","downloads","profile","messages","social","library","rooms","dates","bookclub"];
const GUIDE_FILMS = {"big-buck-bunny":"Big Buck Bunny",sintel:"Sintel","tears-of-steel":"Tears of Steel",spring:"Spring","alice-1903":"Alice in Wonderland"};
const guideRequests = new Map();
app.post("/api/guide/chat", authed, async (req,res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({error:"Groq is not configured. Add GROQ_API_KEY to the backend environment."});
  const question = typeof req.body?.message === "string" ? req.body.message.trim().slice(0,700) : "";
  if (!question) return res.status(400).json({error:"Please enter a question."});
  const now=Date.now(), previous=guideRequests.get(req.account.id)||[];
  const recent=previous.filter(t=>now-t<60000);
  if(recent.length>=12)return res.status(429).json({error:"Too many requests. Try again shortly."});
  recent.push(now);guideRequests.set(req.account.id,recent);
  const counts=new Map();
  function record(title,field,n=1){const key=String(title||"").trim().toLowerCase();if(!key)return;
    if(!counts.has(key))counts.set(key,{title:String(title).trim().slice(0,100),discussions:0,likes:0,positiveRecommendations:0});counts.get(key)[field]+=n;}
  for(const post of accountStore.storyCirclePosts||[]){let title=GUIDE_FILMS[post.filmId];if(title){record(title,"discussions");record(title,"likes",Array.isArray(post.likes)?post.likes.length:0);}}
  for(const post of accountStore.recommendations||[]){if(post.repostOf)continue;record(post.title,"positiveRecommendations",post.recommend===true?1:0);
    record(post.title,"likes",(accountStore.recommendationReactions||[]).filter(r=>r.postId===post.id&&r.emoji==="❤️").length);}
  const records=[...counts.values()];
  const top=(field)=>[...records].filter(x=>x[field]>0).sort((a,b)=>b[field]-a[field]).slice(0,5).map(x=>({title:x.title,count:x[field]}));
  const context={availableFilms:GUIDE_FILMS,pages:GUIDE_PAGES,mostDiscussed:top("discussions"),mostLiked:top("likes"),mostRecommended:top("positiveRecommendations"),watchCountsAvailable:false};
  const rawHistory=Array.isArray(req.body?.history)?req.body.history.slice(-8):[];
  const history=rawHistory.filter(x=>x&&["user","assistant"].includes(x.role)&&typeof x.content==="string").map(x=>({role:x.role,content:x.content.slice(0,700)}));
  const platformKnowledge = `

ONAHEYA SOCIAL PLATFORM KNOWLEDGE:

ONAHEYA is both a streaming platform and a social
entertainment community.

Users can:
- Create and personalise their profiles.
- Follow other members and explore their profiles.
- Publish posts about films, series and stories they love.
- Share movie recommendations and personal opinions.
- Like, react to and comment on other members' posts.
- Repost interesting posts to share them with others.
- Share or forward posts with friends through supported
  in-app sharing features.
- Exchange private messages with other members.
- Discover new films through community recommendations.
- Participate in film-specific Story Circles.
- Arrange Movie Dates and synchronized watch parties.
- Save memorable viewing moments and revisit memories.
- Download supported films for offline playback.

When explaining ONAHEYA, give equal importance to its
streaming experience and its social community.

Do not describe ONAHEYA merely as a movie player or
watch-party application.

Use a friendly, welcoming, confident brand voice.
Never invent features, titles, viewing statistics or
content availability.

PRIVACY: Never access or claim access to other users' private content. No fabricated personal preferences, followers, watch history, audience counts, popularity or ratings. "Most watched" cannot be determined from current data. Aggregate "most discussed", "most liked" and "most recommended" may be available from the provided statistics; don't confuse these with streaming views.
`; 
  const system=`You are ONAHEYA Guide ♡, a friendly, accurate, conversational help assistant INSIDE ONAHEYA. Answer ANY legitimate question about this platform using the knowledge below, including "What is ONAHEYA?" and specific how-to requests. Answer the question directly, rather than suggesting example prompts. For questions unrelated to ONAHEYA, gently steer the user back to the platform. Use conversation history for follow-ups. Responses should be specific, warm and concise (often 2-5 sentences). Do not invent operational features, metrics, films, prices, rights, subscription plans or controls. The provided real-time JSON is the ONLY source for current community metrics. Do not repeat an unhelpful boilerplate fallback. If an answer is unknown, say that clearly. Never claim you navigated, downloaded or started playback. Use a relevant action button only if useful. Navigation page MUST be an item of the JSON pages list, otherwise null. filmId MUST be a key of availableFilms, otherwise null. Respond ONLY in valid JSON with keys reply (plain text, <=1200 characters), page (string or null), filmId (string or null).
${platformKnowledge}
CURRENT DATA: ${JSON.stringify(context)}`;
  try {
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
    let response;
    try {response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",signal:controller.signal,headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:process.env.GROQ_MODEL||"openai/gpt-oss-20b",temperature:0.35,max_completion_tokens:850,response_format:{type:"json_object"},messages:[{role:"system",content:system},...history,{role:"user",content:question}]})
    });}finally{clearTimeout(timer);}
    if(!response.ok){console.error("Groq Guide error",response.status,(await response.text()).slice(0,250));return res.status(502).json({error:"The AI guide is unavailable right now. Please try again."});}
    const data=await response.json();let parsed;
    try{parsed=JSON.parse(data.choices?.[0]?.message?.content||"{}");}catch{parsed={};}
    const reply=typeof parsed.reply==="string"&&parsed.reply.trim()?parsed.reply.trim().slice(0,1200):"I couldn't prepare an answer right now. Please try again.";
    const page=GUIDE_PAGES.includes(parsed.page)?parsed.page:null;
    const filmId=Object.hasOwn(GUIDE_FILMS,parsed.filmId)?parsed.filmId:null;
    return res.json({reply,page,filmId});
  }catch(error){console.error("Guide request failed:",error.message);return res.status(502).json({error:"ONAHEYA Guide couldn't connect to Groq right now."});}
});

const port = Number(process.env.PORT || 3001);
server.listen(port, "0.0.0.0", () => console.log(`ONAHEYA real-time server on port ${port}`));

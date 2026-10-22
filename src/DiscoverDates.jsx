import { BookDiscussion, SharedWatchlists } from "./StorySocial";
import BookReader from "./BookReader";
import {bookForFilm} from "./BookLibrary";
import { DEMO_FILMS } from "./DemoFilms";
import { filmArtwork } from "./FilmArtwork";
import { useEffect, useState } from "react";
import "./DiscoverDates.css";
import OnaheyaConfirm from "./OnaheyaConfirm";
const BASE=import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const posterUrl = path => /^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path || "") ? `https://image.tmdb.org/t/p/w342${path}` : null;
async function api(path, options={}) {
  const response=await fetch(`${BASE}${path}`, {...options, headers:{Authorization:`Bearer ${localStorage.getItem("onaheya-session")}`, ...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw Error(data.error||"Request failed.");
  return data;
}
function localPoster(title) {
  const key = String(title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {bigbunny: "big-buck-bunny", coffeerun: "coffee-run"};
  const film = DEMO_FILMS.find(f => f.id === aliases[key] || f.title.toLowerCase().replace(/[^a-z0-9]/g, "") === key);
  if (!film) return null;
  const newPosters = {
    caminandes: "/images/posters/caminandes.png",
    "coffee-run": "/images/posters/coffee-run.png",
    "journeys-of-apollo": "/images/posters/journeys-of-apollo.png",
    "whos-out-there": "/images/posters/whos-out-there.png",
  };
  return newPosters[film.id] || filmArtwork[film.id]?.src || `/images/posters/${film.id}.jpg`;
}
function PostEngagement({post, onRefresh}) {
 const [replies,setReplies]=useState([]), [text,setText]=useState(""), [error,setError]=useState(""), [busy,setBusy]=useState(false);
 async function refreshReplies(){ try{setReplies((await api(`/api/recommendations/${post.id}/comments`)).comments||[])}catch(e){setError(e.message)} }
 useEffect(()=>{refreshReplies()},[post.id]);
 async function react(emoji){setBusy(true);try{await api(`/api/recommendations/${post.id}/react`,{method:"POST",body:JSON.stringify({emoji})});onRefresh?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function comment(e){e.preventDefault();setBusy(true);try{await api(`/api/recommendations/${post.id}/comments`,{method:"POST",body:JSON.stringify({text})});setText("");await refreshReplies();onRefresh?.()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="od-engagement"><div className="od-reactions">{["❤️","😂","👏","🥹"].map(emoji=><button disabled={busy} key={emoji} onClick={()=>react(emoji)} type="button" aria-label={`React ${emoji}`} aria-pressed={post.myReaction===emoji}>{emoji} {post.reactions?.[emoji]||0}</button>)}<span>{post.commentCount||0} comments</span></div><div className="od-comments">{replies.map(r=><div key={r.id} className="od-comment"><strong>{r.author?.displayName||"Member"}</strong><p>{r.text}</p></div>)}</div><form onSubmit={comment} className="od-comment-form"><input aria-label="Write a comment" placeholder="Share your thoughts…" required maxLength={500} value={text} onChange={e=>setText(e.target.value)}/><button disabled={busy||!text.trim()}>Comment</button></form>{error&&<small role="alert">{error}</small>}</div>
}
function Post({post, self, onRefresh, onPlan, onAuthorClick}) {
 const [sending,setSending]=useState(false); const [forwardName,setForwardName]=useState(""); const [actionError,setActionError]=useState("");
 const [deleteOpen,setDeleteOpen]=useState(false); const [deleting,setDeleting]=useState(false);
 async function act(path,body){try{setActionError("");await api(`/api/recommendations/${post.id}/${path}`,{method:"POST",...(body?{body:JSON.stringify(body)}:{})});setSending(false);onRefresh?.()}catch(e){setActionError(e.message)}}
 const [show,setShow]=useState(!post.spoiler);
 const [legacyPoster,setLegacyPoster]=useState(null);
 useEffect(()=>{
   if (post.posterPath) return;
   let cancelled=false;
   api(`/api/catalog/lookup?title=${encodeURIComponent(post.title)}&kind=${encodeURIComponent(post.kind)}`)
     .then(d=>{if(!cancelled)setLegacyPoster(d.result?.posterPath || null)}).catch(()=>{});
   return ()=>{cancelled=true};
 },[post.title,post.kind,post.posterPath]);
 const cover=localPoster(post.title) || posterUrl(post.posterPath || legacyPoster);
 const [imageBroken,setImageBroken]=useState(false);
 return <article className="od-post od-post-cover">{cover && !imageBroken ? <img className="od-post-poster" src={cover} alt={`${post.title} poster`} loading="lazy" onError={()=>setImageBroken(true)}/> : <div className="od-poster-placeholder"><span>ONAHEYA FILM CLUB</span><strong>{post.title}</strong><small>Recommended story</small></div>}<div className="od-post-content"><div className="od-author"><button type="button" className="od-author-link" onClick={()=>onAuthorClick?.(post.author?.username)} aria-label="View author profile">{post.author?.avatarUrl?<img src={post.author.avatarUrl} alt=""/>:<span>{post.author?.displayName?.[0]||"♡"}</span>}<div><strong>{post.author?.displayName || "Member"}</strong><small>@{post.author?.username}</small></div></button><time>{new Date(post.createdAt).toLocaleDateString()}</time></div><p className="od-tag">{post.kind} · {post.recommend?"♡ Recommended":"Watched"}</p><h3>{post.title}</h3>{show?<p className="od-review">{post.review}</p>:<button type="button" onClick={()=>setShow(true)}>Spoilers hidden — reveal review</button>}{post.originalAuthor && <p className="od-reposted">↻ Reposted from @{post.originalAuthor.username}</p>}
 <div className="od-share-actions"><button onClick={()=>act("save")}>{post.saved?"♥ Saved":"♡ Save"}</button><button onClick={()=>act("repost")}>↻ Repost</button><button onClick={()=>setSending(v=>!v)}>↗ Forward</button>{onPlan && <button type="button" onClick={()=>onPlan(post)}>♡ Plan movie</button>}</div>
 {sending && <form className="od-forward" onSubmit={e=>{e.preventDefault();act("forward",{username:forwardName})}}><input required placeholder="Recipient @username" value={forwardName} onChange={e=>setForwardName(e.target.value)}/><button>Send</button></form>}{actionError&&<small role="alert" className="od-error">{actionError}</small>}{self?.id===post.authorId&&<button type="button" className="od-muted" onClick={()=>setDeleteOpen(true)}>Delete post</button>}
 <OnaheyaConfirm open={deleteOpen} title="Delete this post?" message="This recommendation and its conversation will be removed from the community. This can't be undone." confirmLabel="Delete post" danger busy={deleting} onCancel={()=>setDeleteOpen(false)} onConfirm={async()=>{setDeleting(true);setActionError("");try{await api(`/api/recommendations/${post.id}`,{method:"DELETE"});setDeleteOpen(false);await onRefresh?.();}catch(e){setActionError(e.message)}finally{setDeleting(false)}}}/>
 <PostEngagement post={post} onRefresh={onRefresh}/></div></article>;
}
function Catalogue({onPick, onPlan}) {
 const [query,setQuery]=useState("");
 const [kind,setKind]=useState("All");
 const [page,setPage]=useState(1);
 const [movies,setMovies]=useState([]);
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
   let active=true;
   const timer=setTimeout(async()=>{
     setLoading(true);setMessage("");
     try {
       const d=await api(`/api/catalog?q=${encodeURIComponent(query)}&kind=${encodeURIComponent(kind)}&page=${page}`);
       if(active)setMovies(d.results || []);
     }catch(e){if(active){setMovies([]);setMessage(e.message)}}
     finally{if(active)setLoading(false)}
   },query?350:0);
   return ()=>{active=false;clearTimeout(timer)};
 },[query,kind,page]);
 return <section className="od-catalog" aria-label="Browse movies and series">
   <div className="od-catalog-heading"><div><p className="eyebrow">FIND YOUR NEXT STORY</p><h3>Explore movies & series ♡</h3><p>Browse trending titles or find your favourites to recommend and plan together.</p></div></div>
   <div className="od-catalog-search"><input aria-label="Search movies and series" placeholder="Search films, series, anime..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/><select aria-label="Catalogue type" value={kind} onChange={e=>{setKind(e.target.value);setPage(1)}}><option>All</option><option>Movie</option><option>Series</option></select></div>
   {message && <p className="od-help" role="status">{message}</p>}
   {loading && <p className="od-help">Finding stories…</p>}
   {!loading && !message && movies.length===0 && <p className="od-help">No titles found. Try another search.</p>}
   <div className="od-catalog-list">{movies.map(movie=><article className="od-movie" key={`${movie.type}-${movie.id}`}>
     {posterUrl(movie.posterPath)?<img src={posterUrl(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy"/>:<div className="od-catalog-placeholder">🎬</div>}
     <div className="od-movie-info"><strong>{movie.title}</strong><small>{movie.kind} {movie.year ? `· ${movie.year}` : ""} {movie.rating ? `· ★ ${movie.rating}` : ""}</small><p>{movie.overview || "Discover this story together."}</p>
     <div className="od-movie-actions"><button type="button" onClick={()=>onPick(movie)}>♡ Recommend</button><button type="button" onClick={()=>onPlan(movie)}>Plan a date →</button></div></div>
   </article>)}</div>
   {!message && <div className="od-pagination"><button disabled={page===1 || loading} onClick={()=>setPage(x=>Math.max(1,x-1))}>← Previous</button><span>Page {page}</span><button disabled={loading || movies.length===0 || page===5} onClick={()=>setPage(x=>Math.min(5,x+1))}>More titles →</button></div>}
   <p className="od-attribution">Movie and series data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Catalogue listings do not provide streaming access.</p>
 </section>;
}

function PlayableLibrary({onWatch}) {
  const [selectedMood,setSelectedMood]=useState("All moods");
  const [reading,setReading]=useState(null);
  const [filter,setFilter]=useState("");
  const moodMap={"Need a laugh":["big-buck-bunny"],"Feel enchanted":["alice-1903","spring","sintel"],"Adventure tonight":["sintel","tears-of-steel","spring"],"Something thoughtful":["tears-of-steel","alice-1903"]};
  const films=DEMO_FILMS.filter(f=>`${f.title} ${f.genre}`.toLowerCase().includes(filter.toLowerCase()) && (selectedMood==="All moods" || moodMap[selectedMood]?.includes(f.id)));
  return <section className="od-playable-library">
    <div className="od-catalog-heading"><div><p className="eyebrow">READY FOR MOVIE NIGHT</p><h3>Watch together — free demo films ♡</h3><p>Actual playable films, not trailers or posters. Choose one to create a synchronized room.</p></div></div>
    <div className="oss-moods" role="group" aria-label="Discover by mood">{["All moods","Need a laugh","Feel enchanted","Adventure tonight","Something thoughtful"].map(m=><button key={m} type="button" aria-pressed={selectedMood===m} onClick={()=>setSelectedMood(m)}>{m}</button>)}</div>
    <input className="od-playable-search" placeholder="Find a demo film…" aria-label="Search playable films" value={filter} onChange={e=>setFilter(e.target.value)} />
    <div className="od-playable-grid">{films.map(f=><article key={f.id} className={`od-playable-card od-film-${f.tone}`}>
      <div className="od-playable-art"><span className="od-film-play">▶</span><small>{f.runtime}</small></div>
      <div className="od-playable-body"><h4>{f.title}</h4><p>{f.year} · {f.genre}</p><p>{f.description}</p><small>{f.credit}</small><div className="od-film-actions"><button type="button" className="od-playable-btn" onClick={()=>onWatch?.(f)}>▶ Watch Together</button>{bookForFilm(f)&&<button type="button" className="od-read-btn" onClick={()=>setReading(bookForFilm(f))}>📖 Read the Book</button>}</div></div>
    </article>)}</div>
    {reading && <BookReader book={reading} onClose={()=>setReading(null)} onWatch={()=>onWatch?.(DEMO_FILMS.find(f=>f.id===reading.filmId))}/>}
    <p className="od-attribution">Demo includes open films by Blender and the public-domain 1903 Alice adaptation. Retain original end credits. Video files must be installed locally in public/videos; film listings alone do not include video bytes.</p>
  </section>;
}
export function ProfilePosts({profile,username,onAuthorClick}){
 const [posts,setPosts]=useState([]);const [error,setError]=useState("");
 const refresh=async()=>{try{const data=await api(`/api/recommendations?username=${encodeURIComponent(username||profile?.username||"")}`);setPosts(data.posts||[])}catch(e){setError(e.message)}};
 useEffect(()=>{if(profile) refresh();},[profile?.id,username]);
 if(!profile)return null;
 return <div className="od-profile-posts"><div className="od-profile-stats"><span><strong>{posts.length}</strong> posts</span><span><strong>{posts.reduce((sum,p)=>sum+(Object.values(p.reactions||{}).reduce((a,n)=>a+n,0)),0)}</strong> reactions received</span></div><h3>Movie diary & recommendations ♡</h3>{error&&<p role="alert">{error}</p>}{posts.length===0?<p>No movie posts yet. Your first recommendation could be someone's next favourite.</p>:posts.map(post=><Post key={post.id} post={post} self={profile} onRefresh={refresh} onAuthorClick={onAuthorClick}/>)}</div>;
}
export default function DiscoverDates({profile,onGoProfile,onStartWatch,onJoinWatch,onWatchDemo,section="community",initialFilmTitle="",onGoUser}){
 const [composeOpen,setComposeOpen]=useState(false);const [selectedPerson,setSelectedPerson]=useState(null);const [peopleQuery,setPeopleQuery]=useState("");const [people,setPeople]=useState([]);const [socialTab,setSocialTab]=useState("feed");const [savedPosts,setSavedPosts]=useState([]);const [forwards,setForwards]=useState([]);const [personError,setPersonError]=useState("");const [tab,setTab]=useState(section === "dates" ? "dates" : "discover");const [posts,setPosts]=useState([]);const [dates,setDates]=useState([]);const [title,setTitle]=useState("");const [review,setReview]=useState("");const [kind,setKind]=useState("Movie");const [recommend,setRecommend]=useState(true);const [spoiler,setSpoiler]=useState(false);const [invitees,setInvitees]=useState("");const [dateTitle,setDateTitle]=useState(initialFilmTitle || "");const [startsAt,setStartsAt]=useState("");const [mood,setMood]=useState("Cozy");const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);const [selectedMovie,setSelectedMovie]=useState(null);
 const refresh=async()=>{if(!profile)return;try{const [p,d]=await Promise.all([api("/api/recommendations"),api("/api/movie-dates")]);setPosts(p.posts||[]);setDates(d.dates||[])}catch(e){setError(e.message)}};
 useEffect(()=>{refresh()},[profile?.id]);
 useEffect(()=>{setTab(section === "dates" ? "dates" : "discover")},[section]);
 useEffect(()=>{if(initialFilmTitle)setDateTitle(initialFilmTitle)},[initialFilmTitle]);
 useEffect(()=>{if(!profile || tab!=="dates")return;const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[profile?.id,tab]);
 useEffect(()=>{if(!profile||section==="dates")return;let cancelled=false;api(`/api/people?q=${encodeURIComponent(peopleQuery)}`).then(d=>{if(!cancelled)setPeople(d.people||[])}).catch(()=>{});return()=>{cancelled=true}},[peopleQuery,profile?.id,section]);
 async function loadCollections(){try{const [saved,inbox]=await Promise.all([api("/api/recommendations/saved"),api("/api/recommendations/forwarded")]);setSavedPosts(saved.posts||[]);setForwards(inbox.forwards||[])}catch(e){setPersonError(e.message)}}
 useEffect(()=>{if(profile&&section!=="dates")loadCollections()},[profile?.id,section,socialTab]);
 async function visitPerson(username){if(!username)return;try{setPersonError("");const d=await api(`/api/people/${encodeURIComponent(username)}`);setSelectedPerson(d.profile);setSocialTab("person")}catch(e){setPersonError(e.message)}}
 async function toggleFollow(username,following){try{await api(`/api/people/${encodeURIComponent(username)}/follow`,{method:following?"DELETE":"POST"});await visitPerson(username)}catch(e){setPersonError(e.message)}}
 async function perform(fn){setBusy(true);setError("");setNotice("");try{await fn();await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 if(!profile)return <section className="od-page screen-panel"><h2>Discover & Movie Dates ♡</h2><p>Sign in to recommend films and plan watch nights.</p><button className="primary-btn" onClick={onGoProfile}>Sign in</button></section>;
 return <section className="od-page screen-panel"><header><p className="eyebrow">{section === "dates" ? "YOUR MOVIE NIGHTS" : "YOUR COMMUNITY"}</p><h2>{section === "dates" ? "My Movie Dates ♡" : "Community ♡"}</h2><p>{section === "dates" ? "Plan a film and manage invitations from friends." : "Recommend stories, react and have conversations."}</p></header>{error&&<p className="od-error" role="alert">{error}</p>}{notice&&<p className="od-notice" role="status">{notice}</p>}
 {section!=="dates"&&<><div className="od-social-tabs">{[["feed","Feed"],["people","Find people"],["saved","Favourites"],["inbox","Forwarded to me"]].map(([id,label])=><button key={id} className={socialTab===id?"active":""} onClick={()=>{setSocialTab(id);if(id!=="person")setSelectedPerson(null)}}>{label}</button>)}</div>{personError&&<p role="alert" className="od-error">{personError}</p>}
 {socialTab==="people"&&<div className="od-people-panel"><input placeholder="Search usernames or names…" value={peopleQuery} onChange={e=>setPeopleQuery(e.target.value)}/><div className="od-person-results">{people.map(p=><button key={p.id} onClick={()=>visitPerson(p.username)}>{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:<span>♡</span>}<strong>{p.displayName}</strong><small>@{p.username}</small></button>)}</div></div>}
 {socialTab==="person"&&selectedPerson&&<div className="od-public-profile"><button onClick={()=>setSocialTab("feed")}>← Back to community</button><div className="od-profile-identity">{selectedPerson.avatarUrl&&<img src={selectedPerson.avatarUrl} alt=""/>}<div><h3>{selectedPerson.displayName}</h3><small>@{selectedPerson.username}</small><p>{selectedPerson.bio||"No bio yet."}</p></div></div><div className="od-profile-stats"><span>{selectedPerson.followersCount||0} followers</span><span>{selectedPerson.followingCount||0} following</span></div>{!selectedPerson.isSelf&&<button className="od-plan" onClick={()=>toggleFollow(selectedPerson.username,selectedPerson.isFollowing)}>{selectedPerson.isFollowing?"Following · Unfollow":"♡ Follow"}</button>}<ProfilePosts profile={profile} username={selectedPerson.username} onAuthorClick={visitPerson}/></div>}
 {socialTab==="saved"&&<div className="od-feed"><h3>Favourite posts</h3>{!savedPosts.length&&<p>No saved posts yet.</p>}{savedPosts.map(p=><Post key={p.id} post={p} self={profile} onRefresh={()=>{refresh();loadCollections()}} onAuthorClick={visitPerson}/>)}</div>}
 {socialTab==="inbox"&&<div className="od-feed"><h3>Posts forwarded to you</h3>{!forwards.length&&<p>No forwarded posts yet.</p>}{forwards.map(f=><div key={f.id}><p className="od-forward-from">Sent by {f.from?.displayName||"Member"}</p><Post post={f.post} self={profile} onRefresh={()=>{refresh();loadCollections()}} onAuthorClick={visitPerson}/></div>)}</div>}
 </>}
{(section==="dates"||socialTab==="feed")&&(tab==="discover"?<><div className="od-community-layout"><div className="od-community-stream"><div className="od-feed"><h3>Community recommendations</h3>{posts.length===0?<p>No recommendations yet. Be the first!</p>:posts.map(p=><Post key={p.id} post={p} self={profile} onRefresh={refresh} onAuthorClick={visitPerson} onPlan={(post)=>{setDateTitle(post.title);setTab("dates");setNotice(`Planning a watch night for ${post.title} ♡`);}}/>)}</div></div><div className="od-compose-slot"><button className="od-compose-prompt" type="button" onClick={()=>setComposeOpen(v=>!v)}><span className="od-compose-avatar">{profile.avatarUrl?<img src={profile.avatarUrl} alt=""/>:profile.displayName?.[0]}</span><span>{composeOpen?"Close composer":"Share a movie moment…"}</span><b>{composeOpen?"✕":"＋ Post"}</b></button>{composeOpen&&<form className="od-card" onSubmit={e=>{e.preventDefault();perform(async()=>{await api("/api/recommendations",{method:"POST",body:JSON.stringify({title,review,kind,recommend,spoiler,posterPath:selectedMovie?.title===title ? selectedMovie.posterPath : null,tmdbId:selectedMovie?.title===title ? selectedMovie.id : null})});setTitle("");setReview("");setSelectedMovie(null);setNotice("Posted to Community and your profile ♡");setComposeOpen(false)})}}><h3>Share a movie moment</h3><label>Movie or series title<input required maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);setSelectedMovie(null)}} placeholder="What did you watch?"/></label><label>Type<select value={kind} onChange={e=>{setKind(e.target.value);setSelectedMovie(null)}}><option>Movie</option><option>Series</option></select></label><label>Your thoughts<textarea required maxLength={1000} rows={5} value={review} onChange={e=>setReview(e.target.value)} placeholder="What did you love (or not love) about it?"/></label><label className="od-check"><input type="checkbox" checked={recommend} onChange={e=>setRecommend(e.target.checked)}/> I recommend watching this</label><label className="od-check"><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}/> Contains spoilers (hide review until opened)</label><button className="primary-btn" disabled={busy}>Publish recommendation ♡</button></form>}</div></div></>:<div className="od-grid"><form className="od-card" onSubmit={e=>{e.preventDefault();perform(async()=>{await api("/api/movie-dates",{method:"POST",body:JSON.stringify({title:dateTitle,usernames:invitees.split(",").map(s=>s.trim()).filter(Boolean),startsAt:new Date(startsAt).toISOString(),mood})});setDateTitle("");setInvitees("");setStartsAt("");setNotice("Movie date invitations sent ♡")})}}><h3>Plan a Movie Date ♡</h3><label>What are we watching?<input required maxLength={120} value={dateTitle} onChange={e=>setDateTitle(e.target.value)} placeholder="Film or series title"/></label><label>Invite usernames (separate with commas)<input required value={invitees} onChange={e=>setInvitees(e.target.value)} placeholder="kyle, jay"/></label><label>Date and time (your local time)<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label><label>Room mood<select value={mood} onChange={e=>setMood(e.target.value)}>{["Cozy","Sunset","Rainy","Late Night","Romance"].map(m=><option key={m}>{m}</option>)}</select></label><button className="primary-btn" disabled={busy}>Send invitations ♡</button><p className="od-help">After invitations are accepted, the host can open a live room; accepted guests can then join it.</p></form><div className="od-feed"><h3>Your upcoming movie plans</h3>{dates.length===0?<p>No movie dates yet.</p>:dates.map(d=><article className="od-post" key={d.id}><p className="od-tag">{d.mood} · {d.hostId===profile.id?"You're hosting":"You're invited"}</p><h3>{d.title}</h3><p>{new Date(d.startsAt).toLocaleString(undefined,{dateStyle:"full",timeStyle:"short"})}</p><p>Host: {d.host?.displayName||"Member"}</p><p>{d.invitees.map(i=>`${i.user?.displayName||"Member"}: ${i.status}`).join(" · ")}</p>{d.hostId===profile.id ? <button className="od-plan" disabled={busy} onClick={()=>onStartWatch(d)}>▶ Open watch room</button> : d.responses[profile.id]==="accepted" && d.roomCode ? <button className="od-plan" onClick={()=>onJoinWatch(d)}>♡ Join live movie date</button> : d.responses[profile.id]==="accepted" ? <p className="od-help">Accepted ♡ Waiting for the host to open the room. Refresh this page when they're ready.</p> : null}{d.hostId!==profile.id&&d.responses[profile.id]==="pending"&&<div className="od-actions"><button disabled={busy} onClick={()=>perform(async()=>{await api(`/api/movie-dates/${d.id}/respond`,{method:"POST",body:JSON.stringify({accept:true})})})}>Accept ♡</button><button disabled={busy} onClick={()=>perform(async()=>{await api(`/api/movie-dates/${d.id}/respond`,{method:"POST",body:JSON.stringify({accept:false})})})}>Decline</button></div>}</article>)}</div></div>)}</section>;
}

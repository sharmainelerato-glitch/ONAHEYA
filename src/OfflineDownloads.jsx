import { useEffect, useState } from "react";
import { DEMO_FILMS } from "./DemoFilms";
import { filmArtwork } from "./FilmArtwork";
import "./OfflineDownloads.css";

const CACHE = "onaheya-offline-films-v1";
const KEY = "onaheya-offline-film-ids";
const stored = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
// Catalogue episodes have their own saved IDs, unlike their parent series.
const resolveSavedFilm = (id) => {
  const film = DEMO_FILMS.find(f => f.id === id);
  if (film) return { ...film };
  for (const series of DEMO_FILMS) {
    const episode = series.episodes?.find(ep => ep.id === id);
    if (episode) return {
      ...series,
      id: episode.id,
      title: `${series.title} · Episode ${episode.number}: ${episode.title}`,
      runtime: episode.runtime,
      file: episode.file,
      posterId: series.id,
    };
  }
  return null;
};
const notify = () => window.dispatchEvent(new Event("onaheya-download-change"));
const saveId = id => { localStorage.setItem(KEY, JSON.stringify([...new Set([...stored(),id])])); notify(); };
const removeId = id => { localStorage.setItem(KEY, JSON.stringify(stored().filter(x=>x!==id))); notify(); };

export function DownloadFilmButton({ film }) {
  const [status,setStatus] = useState("checking");
  const [progress,setProgress] = useState(0);
  const [error,setError] = useState("");
  const file = film?.file;
  const id = film?.id;

  async function cached() {
    if (!file || !("caches" in window)) return false;
    const cache = await caches.open(CACHE);
    return Boolean(await cache.match(file));
  }

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const exists = await cached();
        if (live) {
          setStatus(previous => previous === "loading" ? previous : (exists ? "saved" : "idle"));
          if (!exists) setProgress(0);
        }
      } catch (e) {
        if (live) { setStatus("idle"); setError(e.message); }
      }
    };
    setStatus("checking");
    refresh();
    window.addEventListener("onaheya-download-change",refresh);
    window.addEventListener("storage",refresh);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return () => {
      live = false;
      window.removeEventListener("onaheya-download-change",refresh);
      window.removeEventListener("storage",refresh);
      window.removeEventListener("focus",refresh);
      document.removeEventListener("visibilitychange",refresh);
    };
  }, [id,file]);

  async function download(){
    setError("");
    // The cache is authoritative; never trust a stale React status.
    try {
      if (await cached()) { setStatus("saved"); return; }
      setStatus("loading");setProgress(0);
      if (!("caches" in window)) throw Error("Offline storage is unavailable in this browser.");
      const response=await fetch(file,{cache:"no-store"});
      if (!response.ok) throw Error("Film file not found. Check public/videos and the catalogue filename.");
      const total=Number(response.headers.get("content-length"))||0;
      const type=response.headers.get("content-type")||"";
      if (type.includes("text/html")) throw Error("The server sent a webpage, not a film. Check its filename.");
      if (!response.body) throw Error("Streaming downloads aren't supported in this browser.");
      const reader=response.body.getReader();const chunks=[];let loaded=0;
      while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;if(total)setProgress(Math.min(99,Math.round(loaded/total*100)));}
      const blob=new Blob(chunks,{type:type||"application/octet-stream"});
      if (!blob.size) throw Error("The downloaded film was empty.");
      const cache=await caches.open(CACHE);
      await cache.put(file,new Response(blob,{headers:{"Content-Type":blob.type,"Content-Length":String(blob.size)}}));
      saveId(id);setProgress(100);setStatus("saved");
    }catch(e){setError(e.message||"Download failed");setStatus("idle");}
  }

  async function recheckOrDownload() {
    if (status === "loading" || status === "checking") return;
    // Clicking Downloaded checks again and will reset the UI if the entry was removed.
    if (status === "saved") {
      try {setStatus(await cached() ? "saved" : "idle");}
      catch (e) {setStatus("idle");setError(e.message);}
      return;
    }
    await download();
  }
  return <span className="ona-download-action"><button type="button" onClick={recheckOrDownload} disabled={status==="loading" || status==="checking"} aria-label={status==="saved" ? "Check downloaded film status" : "Download film for offline viewing"}>{status==="saved"?"✓ Downloaded":status==="loading"?`↓ Downloading ${totalText(progress)}`:status==="checking"?"Checking download…":"↓ Download for offline"}</button>{error&&<small role="alert">{error}</small>}</span>;
}
const totalText=n=>n?`${n}%`:"…";
export default function OfflineDownloads({onBack}){
  const [ids,setIds]=useState(stored());const [active,setActive]=useState(null);const [error,setError]=useState("");
  useEffect(()=>{const refresh=()=>setIds(stored());window.addEventListener("onaheya-download-change",refresh);return()=>window.removeEventListener("onaheya-download-change",refresh)},[]);
  useEffect(()=>()=>{if(active?.url)URL.revokeObjectURL(active.url)},[active]);
  async function play(film){
    setError("");
    try {
      const cache=await caches.open(CACHE);
      const response=await cache.match(film.file);
      if(!response)throw Error(`The saved entry for ${film.title} exists, but the video is not in this browser's offline cache. Open Browse and download that episode again while online.`);
      const blob=await response.blob();
      if(!blob.size)throw Error("The saved video is empty. Please download it again.");
      setActive({film,url:URL.createObjectURL(blob)});
    } catch(e){setError(e.message)}
  }
  async function remove(film) {
    setError("");
    try {
      const cache = await caches.open(CACHE);
      // Remove the actual video first. Do not mark it deleted if browser cache removal fails.
      const deleted = await cache.delete(film.file);
      const stillThere = await cache.match(film.file);
      if (stillThere) throw Error("The browser could not remove this video from offline storage.");
      // The cache may already have been cleared by the browser; either way, remove its ID.
      removeId(film.id);
      window.dispatchEvent(new Event("onaheya-download-change"));
      if (active?.film.id === film.id) setActive(null);
      setMenu(null);
    } catch (e) { setError(`Could not delete download: ${e.message}`); }
  }
  async function removeUnknown(id){
    // An outdated ID may not identify its original file; remove only its stale index entry.
    removeId(id);
  }
  const [menu,setMenu]=useState(null);
  return <section className="ona-offline screen-panel">
    <button className="ona-backlink" onClick={onBack}>← My Space</button>
    <header className="ona-offline-header"><div><span className="ona-offline-eyebrow">YOUR OFFLINE CINEMA</span><h2>My Downloads ♡</h2><p>Your saved films, ready whenever you are.</p></div><span className="ona-offline-count">{ids.length} {ids.length===1?"film":"films"} saved</span></header>
    {error&&<p className="ona-offline-error" role="alert">{error}</p>}
    {active&&<div className="ona-offline-player"><div className="ona-offline-player-head"><h3>{active.film.title} <small>· Playing offline</small></h3><button onClick={()=>setActive(null)}>✕ Close</button></div><video key={active.url} controls autoPlay playsInline src={active.url}/></div>}
    {ids.length===0?<div className="ona-offline-empty"><span>🎬</span><h3>Your offline cinema starts here</h3><p>Browse a film and choose Download for offline. Your saved films will appear here with their artwork.</p></div>:
    <div className="ona-offline-list">{ids.map(id=>{const film=resolveSavedFilm(id);if(!film)return <article className="ona-offline-film ona-offline-unknown" key={id}>
      <div className="ona-offline-art">🎞️</div>
      <div className="ona-offline-info"><h3>Previously saved film</h3><p>This download uses an older catalogue ID: {id}</p><span className="ona-offline-ready">The entry cannot be matched to the current catalogue</span></div>
      <div className="ona-offline-controls"><button className="ona-offline-more" onClick={()=>removeUnknown(id)}>Remove outdated entry</button></div>
    </article>;const art=filmArtwork[film.posterId || film.id] || ({caminandes:{src:"/images/posters/caminandes.png"},"coffee-run":{src:"/images/posters/coffee-run.png"},"journeys-of-apollo":{src:"/images/posters/journeys-of-apollo.png"},"whos-out-there":{src:"/images/posters/whos-out-there.png"}}[film.id]);return <article className="ona-offline-film" key={id}>
      <div className="ona-offline-art">{art?.src?<img src={art.src} alt={`${film.title} artwork`} loading="lazy"/>:<span>🎬</span>}</div>
      <div className="ona-offline-info"><h3>{film.title}</h3><p>{[film.year,film.runtime,film.genre].filter(Boolean).join(" · ")}</p><span className="ona-offline-ready">✓ Downloaded · Available offline</span></div>
      <div className="ona-offline-controls"><button className="ona-offline-play" onClick={()=>play(film)} aria-label={`Play ${film.title} offline`}>▶ <span>Play</span></button><div className="ona-offline-menu-wrap"><button className="ona-offline-more" aria-label={`More options for ${film.title}`} aria-expanded={menu===id} onClick={()=>setMenu(menu===id?null:id)}>⋯</button>{menu===id&&<div className="ona-offline-menu"><button onClick={()=>{setMenu(null);remove(film)}}>Delete download</button></div>}</div></div>
    </article>})}</div>}
    <p className="ona-offline-footnote">Downloads stay on this browser and device. Clearing browser storage may remove them.</p>
  </section>;
}

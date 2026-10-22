import { useState } from "react";
import { DEMO_FILMS } from "./DemoFilms";
import { bookForFilm } from "./BookLibrary";
import BookReader from "./BookReader";
import { DownloadFilmButton } from "./OfflineDownloads";
import { filmArtwork } from "./FilmArtwork";
import StoryCircles from "./StoryCircles";
import "./BrowseStories.css";

const categories = ["All", "Movies", "Series", "Documentaries", "Short Films"];
const additionalArtwork = {
  "caminandes": "/images/posters/caminandes.svg",
  "coffee-run": "/images/posters/coffee-run.svg",
  "journeys-of-apollo": "/images/posters/journeys-of-apollo.svg",
  "whos-out-there": "/images/posters/whos-out-there.svg"
};
const genres = ["All genres", "Romance", "Thriller", "Comedy", "Drama", "Fantasy", "Sci-Fi", "Adventure", "Animation", "Horror", "Mystery", "Action", "Documentary", "Family"];
const genreAliases = { "Sci-Fi": ["sci-fi", "science fiction"], "Animation": ["animation", "animated"] };
const fitsGenre = (film, genre) => {
  if (genre === "All genres") return true;
  const tags = `${film.genre || ""} ${film.description || ""}`.toLowerCase();
  return (genreAliases[genre] || [genre.toLowerCase()]).some(term => tags.includes(term));
};
const moods = { "All stories": null, "Need a laugh": ["big-buck-bunny"], "Feel enchanted": ["alice-1903","spring","sintel"], "Adventure tonight": ["sintel","tears-of-steel","spring"], "Something thoughtful": ["tears-of-steel","alice-1903"] };
function FilmImage({film,wide=false}) {
  const [failed,setFailed] = useState(false);
  const art = filmArtwork[film.id] || (additionalArtwork[film.id] ? {src:additionalArtwork[film.id]} : null);
  return <span className={`ob-poster ${wide ? "ob-poster-wide" : ""} ${failed ? "ob-poster-missing" : ""}`}>
    {!failed && art && <img src={art.src} alt={`${film.title} film artwork`} loading="lazy" onError={()=>setFailed(true)} />}
    {(failed || !art) && <span className="ob-poster-fallback"><span>ONAHEYA FILM CLUB</span><strong>{film.title}</strong></span>}
  </span>;
}
export default function BrowseStories({ onWatch, onGoDates, onGoCommunity, onGoLibrary, selectedFilm, onSelectFilm }) {
  const selected = selectedFilm || null;
  const setSelected = (film) => { setEpisodeNumber(0); onSelectFilm?.(film); };
  const [reading, setReading] = useState(null);
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState("All stories");
  const [genre, setGenre] = useState("All genres");
  const [category, setCategory] = useState("All");
  const [episodeNumber, setEpisodeNumber] = useState(0);
  const activeEpisode = selected?.episodes?.[episodeNumber] || null;
  const playableSelected = activeEpisode ? {...selected, id:activeEpisode.id, title:`${selected.title} · Ep ${activeEpisode.number}: ${activeEpisode.title}`, runtime:activeEpisode.runtime, file:activeEpisode.file} : selected;
  const matchesCategory = f => category === "All" || (category === "Series" ? f.type === "series" : category === "Documentaries" ? f.type === "documentary" : category === "Short Films" ? f.type === "short" || f.id === "big-buck-bunny" || f.id === "spring" : !["series","documentary","short"].includes(f.type));
  const films = DEMO_FILMS.filter(f => matchesCategory(f) && fitsGenre(f, genre) && (!moods[mood] || moods[mood].includes(f.id)) && `${f.title} ${f.genre} ${f.description}`.toLowerCase().includes(query.toLowerCase()));
  const book = selected && bookForFilm(selected);
  const featured = DEMO_FILMS.find(f => f.id === "caminandes") || DEMO_FILMS[0];
  return <section className="ob-shell screen-panel">
    {selected ? <div className="ob-detail">
      <button className="ob-back" onClick={()=>setSelected(null)}>← Back to films</button>
      <div className="ob-detail-hero"><FilmImage film={selected} wide />
        <div className="ob-detail-content"><p className="eyebrow">ONAHEYA · EXPLORE THE STORY</p>
          <h2>{selected.title}</h2><p className="ob-meta">{selected.year} · {selected.genre} · {selected.runtime}</p>
          <p>{selected.description}</p>{book && <span className="ob-novel-pill">📖 Based on a book · Read inside ONAHEYA</span>}
          {selected.episodes && <div className="ob-episodes"><h3>Episodes</h3><div className="ob-episode-list">{selected.episodes.map((ep,index)=><button type="button" key={ep.id} className={episodeNumber===index ? "ob-episode is-selected" : "ob-episode"} onClick={()=>setEpisodeNumber(index)} aria-pressed={episodeNumber===index}><strong>Episode {ep.number} · {ep.title}</strong><small>{ep.runtime}</small></button>)}</div><p>Selected: Episode {activeEpisode?.number} — {activeEpisode?.title}</p></div>}
          <div className="ob-actions"><button className="ob-main" onClick={()=>onWatch?.(playableSelected)}>▶ {selected.episodes ? "Watch Selected Episode Together" : "Watch Together"}</button>
            {book && <button onClick={()=>setReading(book)}>📖 Read the Book</button>}
            <DownloadFilmButton film={playableSelected} />
            <button onClick={()=>onGoDates?.(selected)}>♡ Plan Movie Date</button>
            <button onClick={onGoLibrary}>＋ Save to Shared Watchlist</button>
            <button onClick={onGoCommunity}>💬 Discuss</button>
          </div><small className="ob-film-credit">{selected.credit}</small>
        </div>
      </div>
      <StoryCircles film={selected} onGoCommunity={onGoCommunity} onGoDates={onGoDates} />
      <p className="ob-disclaimer">Playback requires the corresponding video file. Artwork is separate from the video.</p>
    </div> : <>
      <div className="ob-headline"><p className="eyebrow">YOUR NEXT STORY STARTS HERE</p><h2>Browse stories ♡</h2><p>Explore films, episodes and documentaries. Watch together or share what you love.</p></div>
      <div className="ob-featured"><FilmImage film={featured} wide /><div className="ob-featured-content"><span>✦ FEATURED FILM</span>
        <h3>{featured.title}</h3><p>{featured.description}</p>
        <button onClick={()=>setSelected(featured)}>Explore this story →</button></div></div>
      <div className="ob-categories" aria-label="Content type">{categories.map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      <div className="ob-search"><label className="ob-search-label">Search the film library<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search movies, moods or genres…" /></label>
        <div className="ob-moods">{Object.keys(moods).map(m=><button aria-pressed={m===mood} onClick={()=>setMood(m)} key={m}>{m}</button>)}</div>
        <div className="ob-genres" aria-label="Filter films by genre">{genres.map(g => <button type="button" key={g} aria-pressed={genre===g} onClick={()=>setGenre(g)}>{g}</button>)}</div>
      </div>
      <div className="ob-section-title"><h3>Watch together tonight</h3><span>{films.length} titles</span></div>
      <div className="ob-grid">{films.map(f=><button key={f.id} className="ob-tile" onClick={()=>setSelected(f)}>
        <FilmImage film={f} /><span className="ob-tile-info"><strong>{f.title}</strong><small>{f.year} · {f.genre}</small>
        {bookForFilm(f) && <span className="ob-book-tag">📖 Read the book</span>}</span></button>)}</div>
      {!films.length && <p>No titles match this selection. Try another category or genre.</p>}
      <p className="ob-disclaimer">Availability depends on licensed video files installed on this device or accessible from the video host.</p>
    </>}
    {reading && <BookReader book={reading} onClose={()=>setReading(null)} onWatch={()=>{setReading(null);onWatch?.(selected);}} />}
  </section>;
}

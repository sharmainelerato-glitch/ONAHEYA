import { useEffect, useState } from "react";
import { DEMO_FILMS } from "./DemoFilms";
import "./StorySocial.css";
const BASE=import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
async function api(url,opts={}) {
 const response=await fetch(`${BASE}${url}`,{...opts,headers:{Authorization:`Bearer ${localStorage.getItem("onaheya-session")}`,...(opts.body?{"Content-Type":"application/json"}:{}),...opts.headers}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error || "Request failed"); return data;
}
const pretty=id=>DEMO_FILMS.find(f=>f.id===id)?.title || id;
export function BookDiscussion({ bookId="alice-wonderland", username }) {
 const [items,setItems]=useState([]),[text,setText]=useState(""),[chapter,setChapter]=useState(1),[spoiler,setSpoiler]=useState(false),[maxChapter,setMaxChapter]=useState(1),[shown,setShown]=useState([]),[error,setError]=useState("");
 async function load(){try{setItems((await api(`/api/stories/${bookId}/discussion`)).messages||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load();const t=setInterval(load,12000);return()=>clearInterval(t)},[bookId]);
 async function post(e){e.preventDefault();try{await api(`/api/stories/${bookId}/discussion`,{method:"POST",body:JSON.stringify({text,chapter,spoiler})});setText("");await load()}catch(e){setError(e.message)}}
 return <section className="oss-card"><p className="eyebrow">BOOK CLUB ♡</p><h3>Let's talk about Alice</h3><p>Discuss the novel chapter by chapter. Messages after your selected chapter stay hidden.</p>
 <label>I've read through chapter <select value={maxChapter} onChange={e=>setMaxChapter(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>Chapter {i+1}</option>)}</select></label>
 <div className="oss-discussion">{items.filter(m=>m.chapter<=maxChapter).map(m=><article key={m.id}><strong>{m.author?.displayName || "Reader"}</strong><small> · chapter {m.chapter}</small>{m.spoiler&&!shown.includes(m.id)?<button onClick={()=>setShown(x=>[...x,m.id])}>Reveal spoiler</button>:<p>{m.text}</p>}{m.author?.username===username&&<button className="oss-quiet" onClick={async()=>{await api(`/api/stories/${bookId}/discussion/${m.id}`,{method:"DELETE"});load()}}>Delete</button>}</article>)}{!items.length&&<p>No discussion yet. Start the book club ♡</p>}</div>
 <form onSubmit={post}><label>Discuss chapter <select value={chapter} onChange={e=>setChapter(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>Chapter {i+1}</option>)}</select></label><textarea value={text} onChange={e=>setText(e.target.value)} maxLength={1200} required placeholder="What did you notice about Alice's journey?" rows={3}/><label className="oss-check"><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}/> Contains spoilers</label><button className="oss-primary">Post to book club ♡</button></form>{error&&<p className="oss-error" role="alert">{error}</p>}</section>;
}
export function SharedWatchlists({onWatch,username}) {
 const [lists,setLists]=useState([]),[name,setName]=useState(""),[invitees,setInvitees]=useState(""),[pick,setPick]=useState("big-buck-bunny"),[error,setError]=useState(""),[note,setNote]=useState("");
 async function load(){try{setLists((await api("/api/watchlists")).lists||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load();const t=setInterval(load,8000);return()=>clearInterval(t)},[]);
 async function act(fn){setError("");setNote("");try{await fn();await load()}catch(e){setError(e.message)}}
 return <section className="oss-card" aria-label="Shared watchlists"><p className="eyebrow">OUR NEXT STORIES</p><h3>Shared Watchlists ♡</h3><p>Create a list with friends, then everyone on the list can add a playable film.</p>
 <form className="oss-creator" onSubmit={e=>{e.preventDefault();act(async()=>{await api("/api/watchlists",{method:"POST",body:JSON.stringify({name,usernames:invitees.split(",").map(s=>s.trim()).filter(Boolean)})});setName("");setInvitees("");setNote("Watchlist created ♡")})}}><input value={name} maxLength={60} required placeholder="Our cozy movie list" onChange={e=>setName(e.target.value)}/><input value={invitees} placeholder="Friend usernames (optional, comma-separated)" onChange={e=>setInvitees(e.target.value)}/><button className="oss-primary">Create shared list</button></form>
 <label>Add this film to a list <select value={pick} onChange={e=>setPick(e.target.value)}>{DEMO_FILMS.map(f=><option value={f.id} key={f.id}>{f.title}</option>)}</select></label>
 <div className="oss-lists">{lists.map(list=><article key={list.id}><div className="oss-list-title"><div><strong>{list.name}</strong><small>{list.members.map(m=>`@${m.username}`).join(" · ")}</small></div>{list.owner?.username===username&&<button className="oss-quiet" onClick={()=>act(()=>api(`/api/watchlists/${list.id}`,{method:"DELETE"}))}>Delete list</button>}</div>
 <button onClick={()=>act(()=>api(`/api/watchlists/${list.id}/items`,{method:"POST",body:JSON.stringify({filmId:pick})}))}>+ Add selected film</button>
 <div className="oss-list-items">{list.items.map(item=><div key={item.filmId}><span>{pretty(item.filmId)}</span><div><button onClick={()=>onWatch?.(DEMO_FILMS.find(f=>f.id===item.filmId))}>▶ Watch</button><button className="oss-quiet" onClick={()=>act(()=>api(`/api/watchlists/${list.id}/items/${item.filmId}`,{method:"DELETE"}))}>Remove</button></div></div>)}</div></article>)}{!lists.length&&<p>No shared watchlists yet. Create one with a friend!</p>}</div>
 {note&&<p role="status">{note}</p>}{error&&<p role="alert" className="oss-error">{error}</p>}</section>;
}

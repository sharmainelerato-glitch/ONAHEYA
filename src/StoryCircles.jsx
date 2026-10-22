import { useEffect, useState } from "react";
import "./StoryCircles.css";
const BASE=import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
async function request(path,options={}) {
  const token=localStorage.getItem("onaheya-session");
  const response=await fetch(BASE+path,{...options,headers:{Authorization:`Bearer ${token}`,...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Request failed");return data;
}
export default function StoryCircles({film,onGoCommunity,onGoDates}) {
 const [posts,setPosts]=useState([]),[body,setBody]=useState(""),[spoiler,setSpoiler]=useState(false),[reveal,setReveal]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const signedIn=Boolean(localStorage.getItem("onaheya-session"));
 async function refresh(){if(!signedIn)return;try{const data=await request(`/api/story-circles/${film.id}`);setPosts(data.posts||[]);setError("");}catch(e){setError(e.message)}}
 useEffect(()=>{setPosts([]);setReveal([]);refresh();},[film.id]);
 async function publish(e){e.preventDefault();setBusy(true);try{await request(`/api/story-circles/${film.id}`,{method:"POST",body:JSON.stringify({body,spoiler})});setBody("");setSpoiler(false);await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function like(post){try{await request(`/api/story-circles/${film.id}/${post.id}/like`,{method:"POST"});await refresh()}catch(e){setError(e.message)}}
 return <section className="sc-circle" aria-label={`${film.title} Story Circle`}>
  <div className="sc-top"><div><p className="sc-eyebrow">♡ STORY CIRCLE</p><h3>Talk about {film.title}</h3><p>Reviews, theories and conversations around this story.</p></div><button type="button" onClick={()=>onGoDates?.(film)}>♡ Plan a Movie Date</button></div>
  {!signedIn?<p>Sign in to read, react and join the discussion.</p>:<>
   <form className="sc-compose" onSubmit={publish}><label htmlFor="sc-body">Add to the conversation</label><textarea id="sc-body" maxLength={1200} required value={body} onChange={e=>setBody(e.target.value)} placeholder="What did this story make you feel?"/><div className="sc-compose-bottom"><label><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}/> Contains spoilers</label><button disabled={busy||!body.trim()}>Post discussion ♡</button></div></form>
   {error&&<p role="alert" className="sc-error">{error}</p>}
   <div className="sc-posts">{posts.length===0?<p className="sc-empty">No conversations yet. Start the first one ♡</p>:posts.map(post=><article className="sc-post" key={post.id}><header><strong>{post.author?.displayName||"Member"}</strong><span>@{post.author?.username||"member"} · {new Date(post.createdAt).toLocaleDateString()}</span></header>{post.spoiler&&!reveal.includes(post.id)?<button className="sc-spoiler" onClick={()=>setReveal(v=>[...v,post.id])}>Spoilers hidden · Reveal</button>:<p>{post.body}</p>}<button onClick={()=>like(post)} aria-pressed={post.liked}>{post.liked?"♥":"♡"} {post.likes} likes</button></article>)}</div>
  </>}
  <p className="sc-footnote">Each movie has its own discussion. Community remains the place for general recommendations.</p>
 </section>
}

import { useEffect, useRef, useState } from "react";
import { DEMO_FILMS } from "./DemoFilms";
import "./OnaheyaGuide.css";

const BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const quick = ["What is ONAHEYA?", "How do I create a watch party?", "What's most discussed?", "What do people like?", "What is everyone watching?", "Recommend something", "How do I watch with friends?"];
const destinations = [
  { page:"home", words:["home","homepage","start page"] },
  { page:"browse", words:["browse","film library","movies","films","anime","series","discover films"] },
  { page:"community", words:["community","feed","posts","reviews","social"] },
  { page:"downloads", words:["downloads","offline","saved movies","downloaded"] },
  { page:"profile", words:["profile","account","bio","avatar"] },
  { page:"messages", words:["messages","dm","inbox","chat with"] },
  { page:"social", words:["people","followers","following","find friends"] },
  { page:"library", words:["my space","watchlist","saved lists"] },
  { page:"rooms", words:["rooms","watch party","watch together","invite friends"] },
  { page:"dates", words:["movie date","dates","schedule a watch"] },
  { page:"bookclub", words:["book club","bookclub"] }
];
function rankText(items, field, empty) {
  if (!items?.length) return empty;
  return items.slice(0,3).map((x,i)=>`${i+1}. ${x.title} (${x[field]})`).join("\n");
}
export default function OnaheyaGuide({onNavigate,onOpenFilm}) {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [messages,setMessages]=useState([{role:"guide",text:"Hey! ♡ I’m ONAHEYA Guide, powered by Groq AI. Ask me anything about ONAHEYA — features, films, watch parties, your downloads or our community."}]);
  const [insights,setInsights]=useState(null);
  const [error,setError]=useState("");
  const tail=useRef(null);
  useEffect(()=>{if(open)tail.current?.scrollIntoView({block:"nearest"});},[open,messages]);
  async function getInsights() {
    const token=localStorage.getItem("onaheya-session");
    if(!token)throw Error("Sign in to see community activity.");
    const res=await fetch(`${BASE}/api/guide/insights`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.error||"Community stats are currently unavailable.");
    setInsights(data);return data;
  }
  const [busy,setBusy]=useState(false);
  async function answer(phrase) {
    const q=phrase.trim();if(!q||busy)return;
    setInput("");setError("");setBusy(true);
    const existing=messages.filter(m=>m.role==="you"||m.role==="guide").slice(-8).map(m=>({role:m.role==="you"?"user":"assistant",content:m.text}));
    setMessages(old=>[...old,{role:"you",text:q}]);
    try {
      const token=localStorage.getItem("onaheya-session");
      if(!token)throw Error("Please sign in to use ONAHEYA Guide.");
      const response=await fetch(`${BASE}/api/guide/chat`,{method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({message:q,history:existing})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||`ONAHEYA Guide returned error ${response.status}. Check the backend and Groq configuration.`);
      const film=DEMO_FILMS.find(f=>f.id===result.filmId);
      const action=film?{label:`Explore ${film.title}`,film}:result.page?{label:`Go to ${result.page}`,page:result.page}:null;
      setMessages(old=>[...old,{role:"guide",text:result.reply||"Could you try asking that another way?",action}]);
    }catch(e){setMessages(old=>[...old,{role:"guide",text:e.message||"Something went wrong."}]);}
    finally{setBusy(false);}
  }
  function act(action) {if(action.film)onOpenFilm(action.film);else if(action.page)onNavigate(action.page);setOpen(false);}
  return <div className="og-root">
    {open && <section className="og-panel" role="dialog" aria-label="ONAHEYA Guide" aria-modal="false">
      <header className="og-header"><div><strong>✦ ONAHEYA Guide</strong><small>Your story companion ♡</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close guide">×</button></header>
      <div className="og-chat" aria-live="polite">{messages.map((m,i)=><div key={i} className={`og-message ${m.role}`}><span>{m.text}</span>{m.action&&<button type="button" onClick={()=>act(m.action)}>{m.action.label} →</button>}</div>)}{busy&&<div className="og-message guide" aria-live="polite">Thinking… ♡</div>}<div ref={tail}/></div>
      <div className="og-chips">{quick.map(q=><button key={q} type="button" onClick={()=>answer(q)} disabled={busy}>{q}</button>)}</div>
      <form className="og-compose" onSubmit={e=>{e.preventDefault();answer(input)}}><input aria-label="Ask ONAHEYA Guide" placeholder="Ask me anything about ONAHEYA…" maxLength={240} value={input} onChange={e=>setInput(e.target.value)}/><button type="submit" disabled={!input.trim()||busy}>Send</button></form>
      <small className="og-note">Powered by Groq AI · Community rankings use recorded activity, not guesses.</small>
    </section>}
    <button className="og-launch" type="button" onClick={()=>setOpen(p=>!p)} aria-expanded={open} aria-label={open?"Close ONAHEYA Guide":"Open ONAHEYA Guide"}>{open?"×":"✦"}<span>{open?"Close":"Ask ONAHEYA"}</span></button>
  </div>;
}

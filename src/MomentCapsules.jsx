import { useEffect, useState } from "react";
import "./MomentCapsules.css";

const limit = 60;
const keyFor = (nickname) => `onaheya-moments-v1:${String(nickname || "guest").trim().toLowerCase()}`;
const timeCode = seconds => {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(n / 60).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
};
const shortDate = at => new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function makeTicket(moment) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 680;
  const ctx = canvas.getContext("2d");
  const rounded = (x,y,w,h,r) => {ctx.beginPath(); ctx.roundRect(x,y,w,h,r);};
  ctx.fillStyle = "#f8f1e6";ctx.fillRect(0,0,1200,680);
  ctx.fillStyle="#244735";rounded(35,35,1130,610,36);ctx.fill();
  ctx.fillStyle="#d9b77c";ctx.font="bold 27px Arial";ctx.fillText("✦  O N A H E Y A",94,105);
  ctx.fillStyle="#fff6e7";ctx.font="bold 58px Georgia";ctx.fillText("A moment worth keeping.",94,195);
  ctx.font="28px Arial";ctx.fillStyle="#dedfd4";ctx.fillText((moment.roomName||"Movie Night").slice(0,55),94,252);
  ctx.fillStyle="#e5b38d";ctx.font="bold 26px Arial";ctx.fillText(`${shortDate(moment.at)}   •   ${moment.mood || "Cozy"}   •   ${timeCode(moment.position)}`,94,309);
  const words=String(moment.text||"").slice(0,240).split(/\s+/);
  const lines=[];let line="";ctx.font="36px Georgia";
  for (const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>970 && line){lines.push(line);line=word;}else line=test;}
  if(line)lines.push(line);
  ctx.fillStyle="#fff9ef";lines.slice(0,5).forEach((l,i)=>ctx.fillText(l,94,385+i*48));
  ctx.fillStyle="#d4d9ca";ctx.font="23px Arial";ctx.fillText(`Saved by ${String(moment.author||"You").slice(0,32)}  ♡  Different places. Same room.`,94,600);
  const anchor=document.createElement("a");anchor.href=canvas.toDataURL("image/png");anchor.download=`ONAHEYA-memory-${String(moment.id).slice(0,8)}.png`;anchor.click();
}

export default function MomentCapsules({room,nickname,position,participants,sharedMoments=[],active,onToggle,captureMessage,onCaptureConsumed,onShare}) {
  const [saved,setSaved]=useState([]);
  const [note,setNote]=useState("");
  const [selected,setSelected]=useState("mine");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const key=keyFor(nickname);
  useEffect(()=>{try{const found=JSON.parse(localStorage.getItem(key)||"[]");setSaved(Array.isArray(found)?found:[]);}catch{setSaved([]);}},[key]);
  function store(next){try{localStorage.setItem(key,JSON.stringify(next.slice(0,limit)));setSaved(next.slice(0,limit));return true;}catch{setError("Your browser could not save this memory. Check storage settings.");return false;}}
  function create(text,privateChat=false){
    const value=String(text||"").trim();if(!value)return setError("Write a small note first.");
    const item={id:crypto.randomUUID(),author:nickname||"You",roomName:room.name,mood:room.mood,position,at:Date.now(),text:value.slice(0,240),privateChat};
    if(store([item,...saved])){setNotice("Saved privately in this browser ♡");setError("");setNote("");setSelected("mine");}
  }
  useEffect(()=>{if(captureMessage){setNote(String(captureMessage.text||"").slice(0,240));setNotice(captureMessage.fromPrivateChat?"Private-chat memories can be saved personally, not shared with the room.":"Message copied into your personal memory draft.");onCaptureConsumed?.();}},[captureMessage]);
  function share(item){
    if(item.privateChat) return setError("Private chat memories cannot be shared from here.");
    setError("");
    onShare({text:item.text,position:item.position},reply=>{
      if(reply?.ok){setNotice("Shared with everyone currently in this watch room ♡");setSelected("shared");}
      else setError(reply?.error||"Unable to share this moment.");
    });
  }
  return <section className="ona-moments" aria-label="Moment Capsules">
    <button type="button" className="ona-moments-toggle" onClick={onToggle} aria-expanded={active}>✧ Moment Capsules <span>{saved.length} saved · {sharedMoments.length} shared {active?"⌃":"⌄"}</span></button>
    {active&&<div className="ona-moments-content">
      <p className="ona-moments-intro">Keep a little piece of movie night. Memories save privately in this browser unless you choose to share them.</p>
      <form onSubmit={e=>{e.preventDefault();create(note);}} className="ona-moments-form">
        <label htmlFor="ona-memory-note">What would you like to remember?</label>
        <textarea id="ona-memory-note" maxLength={240} rows={2} placeholder="The scene that made us laugh…" value={note} onChange={e=>setNote(e.target.value)}/>
        <div className="ona-moments-actions"><small>At {timeCode(position)} of the movie</small><button type="submit" disabled={!note.trim()}>♡ Save privately</button></div>
      </form>
      {error&&<p role="alert" className="ona-moments-error">{error}</p>}{notice&&<p role="status" className="ona-moments-notice">{notice}</p>}
      <div className="ona-moments-tabs"><button type="button" className={selected==="mine"?"active":""} onClick={()=>setSelected("mine")}>My memories ({saved.length})</button><button type="button" className={selected==="shared"?"active":""} onClick={()=>setSelected("shared")}>Shared ({sharedMoments.length})</button></div>
      <div className="ona-moments-list">{(selected==="mine"?saved:sharedMoments).length===0?<p className="ona-moments-empty">No moments here yet. Your first keepsake is only a note away ♡</p>:(selected==="mine"?saved:sharedMoments.slice().reverse()).map(item=><article className="ona-memory-ticket" key={item.id}>
        <span className="ona-memory-stamp">✦ {item.mood||room.mood} · {timeCode(item.position)} · {shortDate(item.at)}</span>
        <strong>{item.roomName||room.name}</strong><p>{item.text}</p><small>{item.privateChat?"Private conversation · Personal copy":`♡ ${item.author||"Member"}`}</small>
        <div className="ona-memory-buttons"><button type="button" onClick={()=>makeTicket({...item,mood:item.mood||room.mood,roomName:item.roomName||room.name})}>↓ Memory Ticket</button>
        {selected==="mine"&&<><button type="button" disabled={item.privateChat} title={item.privateChat?"Private conversations cannot be shared":"Share with this room"} onClick={()=>share(item)}>Share to room</button><button type="button" onClick={()=>{if(window.confirm("Delete this personal memory?"))store(saved.filter(m=>m.id!==item.id));}}>Delete</button></>}
        {selected==="shared"&&<button type="button" onClick={()=>create(item.text)}>♡ Save my copy</button>}</div>
      </article>)}</div>
      <p className="ona-moments-foot">Personal memories stay in this browser, under the nickname used here. Shared memories disappear when the room server restarts or the room closes. No video or screenshots are captured.</p>
    </div>}
  </section>;
}

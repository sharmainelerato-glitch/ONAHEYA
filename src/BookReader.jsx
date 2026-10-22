import {useEffect,useRef,useState} from "react";
import "./BookReader.css";

const keyFor = (book, suffix) => `onaheya-book-${book.id}-${suffix}`;
function getSaved(key, fallback) {try {const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value);}catch{return fallback;}}
function extractChapters(source) {
 const start=source.search(/CHAPTER\s+I[.\s]/i);
 const end=source.search(/\*\*\* END OF (THE )?PROJECT GUTENBERG/i);
 const text=(start>=0?source.slice(start):source).slice(0,end>start&&end>=0?end-start:undefined).trim();
 const parts=text.split(/(?=^CHAPTER\s+(?:[IVXLCDM]+|\d+)[.\s]*$)/gim).map(x=>x.trim()).filter(Boolean);
 return parts.length>1?parts:[text];
}
export default function BookReader({book,onClose,onWatch}){
 const [sections,setSections]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(false);
 const [chapter,setChapter]=useState(()=>getSaved(keyFor(book,"chapter"),0));
 const [fontSize,setFontSize]=useState(()=>getSaved(keyFor(book,"font"),18));
 const [bookmarked,setBookmarked]=useState(()=>getSaved(keyFor(book,"bookmark"),null));
 const scrollRef=useRef(null);
 useEffect(()=>{let cancelled=false;setLoading(true);setError(false);fetch(book.file).then(async r=>{if(!r.ok||!(r.headers.get("content-type")||"").includes("text"))throw Error("Missing book file");return r.text();}).then(t=>{if(!cancelled){setSections(extractChapters(t));setLoading(false)}}).catch(()=>{if(!cancelled){setLoading(false);setError(true)}});return()=>{cancelled=true}},[book.file]);
 useEffect(()=>{localStorage.setItem(keyFor(book,"chapter"),JSON.stringify(chapter));scrollRef.current?.scrollTo({top:0,behavior:"instant"})},[book,chapter]);
 useEffect(()=>localStorage.setItem(keyFor(book,"font"),JSON.stringify(fontSize)),[book,fontSize]);
 const max=Math.max(0,sections.length-1),current=Math.min(chapter,max);
 function bookmark(){const next=current;setBookmarked(next);localStorage.setItem(keyFor(book,"bookmark"),JSON.stringify(next));}
 return <div className="ob-overlay" role="dialog" aria-modal="true" aria-label={`Read ${book.title}`}>
  <section className="ob-reader">
   <div className="ob-top"><div><span className="ob-label">ONAHEYA · ALSO AVAILABLE AS A BOOK</span><h2>{book.title}</h2><p>{book.author} · {book.year}</p></div><button type="button" onClick={onClose} aria-label="Close reader">✕</button></div>
   <div className="ob-controls"><label>Text size <select value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}><option value={16}>Small</option><option value={18}>Medium</option><option value={22}>Large</option><option value={26}>Extra large</option></select></label><button onClick={bookmark} disabled={loading||error}>♡ Bookmark chapter</button>{bookmarked!==null && <button onClick={()=>setChapter(bookmarked)}>↩ My bookmark</button>}</div>
   <div className="ob-pages" ref={scrollRef}>{loading?<p>Opening your book…</p>:error?<div className="ob-empty"><h3>A little preview ♡</h3><p style={{fontSize}}>{book.preview}</p><p>The full book text is not installed yet. Add the public-domain TXT file at <code>public/books/alice-in-wonderland.txt</code> to read all chapters here.</p><a target="_blank" rel="noreferrer" href={book.publicSource}>Get the free full book from Project Gutenberg ↗</a></div>:<><div className="ob-progress">Chapter {current+1} of {sections.length} · Your place is saved on this device</div><article style={{fontSize,whiteSpace:"pre-wrap"}}>{sections[current]}</article></>}</div>
   <div className="ob-bottom"><button onClick={()=>setChapter(c=>Math.max(0,c-1))} disabled={loading||error||current===0}>← Previous</button><span>{error?"Preview":`Chapter ${current+1} / ${sections.length||"…"}`}</span><button onClick={()=>setChapter(c=>Math.min(max,c+1))} disabled={loading||error||current>=max}>Next →</button><button className="ob-watch" onClick={()=>{onClose();onWatch?.()}}>▶ Watch the film</button></div>
  </section>
 </div>
}

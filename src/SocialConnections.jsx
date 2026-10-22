import { useEffect, useState } from "react";
import "./SocialConnections.css";
import { ProfilePosts } from "./DiscoverDates";

const BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
function Avatar({ person }) {
  return <div className="sc-avatar">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : (person.displayName || "?").slice(0,1).toUpperCase()}</div>;
}
export default function SocialConnections({ profile, onGoProfile }) {
  const [tab, setTab] = useState("people");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connectionType, setConnectionType] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const token = localStorage.getItem("onaheya-session");
  async function api(endpoint, options = {}) {
    const response = await fetch(`${BASE}${endpoint}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || "Please try again.");
    return data;
  }
  async function refreshPeople() {
    if (!token) return;
    try { const data = await api(`/api/people?q=${encodeURIComponent(query)}`); setPeople(data.people); }
    catch (e) { setError(e.message); }
  }
  async function refreshNotifications() {
    if (!token) return;
    try { const data = await api("/api/notifications"); setNotifications(data.notifications); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [p,n] = await Promise.all([
          api(`/api/people?q=${encodeURIComponent(query)}`), api("/api/notifications")
        ]);
        if (!cancelled) { setPeople(p.people); setNotifications(n.notifications); }
      } catch(e) { if (!cancelled) setError(e.message); }
    };
    fetchAll();
    const timer = setInterval(() => { if (document.visibilityState === "visible") fetchAll(); }, 12000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [token, query]);
  async function toggleFollow(person) {
    setBusy(person.username); setError("");
    try {
      await api(`/api/people/${encodeURIComponent(person.username)}/follow`, { method: person.isFollowing ? "DELETE" : "POST" });
      await refreshPeople();
      if (selected?.username === person.username) {
        const data = await api(`/api/people/${encodeURIComponent(person.username)}`);
        setSelected(data.profile);
      }
      if (connectionType && selected) await showConnections(selected.username,connectionType);
    } catch(e) { setError(e.message); }
    finally { setBusy(""); }
  }
  async function openPerson(username) {
    setError(""); setConnectionType(null);
    try { const data = await api(`/api/people/${encodeURIComponent(username)}`); setSelected(data.profile); }
    catch(e) { setError(e.message); }
  }
  async function showConnections(username, type) {
    try { const data = await api(`/api/people/${encodeURIComponent(username)}/connections?type=${type}`); setPeople(data.people); setConnectionType(type); }
    catch(e) { setError(e.message); }
  }
  async function markRead() {
    try { await api("/api/notifications/read", {method:"POST"}); await refreshNotifications(); }
    catch(e) { setError(e.message); }
  }
  if (!profile) return <section className="sc-page"><div className="sc-card"><h2>Find your people ♡</h2><p>Sign in or create an account first to follow people and receive notifications.</p><button className="primary-btn" onClick={onGoProfile}>Go to profile →</button></div></section>;
  return <section className="sc-page screen-panel">
    <div className="sc-heading"><span className="eyebrow">ONAHEYA COMMUNITY</span><h2>People & Connections ♡</h2><p>Discover friends who love the same stories.</p></div>
    <div className="sc-card">
      <div className="sc-tabs">
        <button className={tab === "people" ? "active" : ""} onClick={() => { setTab("people");setConnectionType(null);setSelected(null);refreshPeople(); }}>Discover people</button>
        <button className={tab === "notifications" ? "active" : ""} onClick={() => { setTab("notifications");setSelected(null);refreshNotifications(); }}>Notifications {notifications.filter(n=>!n.read).length > 0 ? `(${notifications.filter(n=>!n.read).length})` : ""}</button>
        <button onClick={onGoProfile}>My profile</button>
      </div>
      {error && <p className="sc-error" role="alert">{error}</p>}
      {tab === "people" && !selected && <>
        <label className="sc-search">Find by display name or username<input value={query} onChange={e=>{setQuery(e.target.value);setConnectionType(null);}} placeholder="Search ONAHEYA people…" /></label>
        <div className="sc-list">{people.map(person => <div className="sc-person" key={person.id}>
          <button className="sc-person-main" onClick={()=>openPerson(person.username)}><Avatar person={person} /><span><strong>{person.displayName}</strong><small>@{person.username} · {person.followersCount} followers</small></span></button>
          <button className="sc-follow" disabled={busy===person.username} onClick={()=>toggleFollow(person)}>{person.isFollowing ? "Following ✓" : "+ Follow"}</button>
        </div>)}{people.length === 0 && <p className="sc-muted">No matching profiles yet. Create a second test account in a private window to try following.</p>}</div>
      </>}
      {tab === "people" && selected && <>
        <button className="sc-back" onClick={()=>{setSelected(null);setConnectionType(null);refreshPeople();}}>← Back to people</button>
        <div className="sc-selected"><Avatar person={selected} /><div><h3>{selected.displayName}</h3><p>@{selected.username}</p><p>{selected.bio || "Movie lover on ONAHEYA ♡"}</p></div></div>
        <div className="sc-stats"><button onClick={()=>showConnections(selected.username,"followers")}>{selected.followersCount} Followers</button><button onClick={()=>showConnections(selected.username,"following")}>{selected.followingCount} Following</button></div>
        {!selected.isSelf && <button className="sc-follow" disabled={busy===selected.username} onClick={()=>toggleFollow(selected)}>{selected.isFollowing ? "Following ✓ — Unfollow" : "+ Follow"}</button>}
        <ProfilePosts profile={profile} username={selected.username} />
        {connectionType && <div className="sc-list"><h4>{connectionType === "followers" ? "Followers" : "Following"}</h4>{people.map(p=><div key={p.id} className="sc-person"><button className="sc-person-main" onClick={()=>openPerson(p.username)}><Avatar person={p}/><span><strong>{p.displayName}</strong><small>@{p.username}</small></span></button>{!p.isSelf && <button className="sc-follow" onClick={()=>toggleFollow(p)}>{p.isFollowing?"Following ✓":"+ Follow"}</button>}</div>)}{!people.length && <p className="sc-muted">Nobody here yet.</p>}</div>}
      </>}
      {tab === "notifications" && <><div className="sc-notification-actions"><button onClick={markRead}>Mark all as read</button></div><div className="sc-list">{notifications.map(n=><div className={`sc-notification ${n.read?"":"unread"}`} key={n.id}><Avatar person={n.actor || {displayName:"?"}}/><div><strong>{n.actor?.displayName || "Someone"}</strong> {n.type === "movie_date_invite" ? " invited you to a movie date ♡" : n.type === "movie_date_response" ? " replied to your movie date invitation ♡" : " started following you ♡"}<small>{new Date(n.createdAt).toLocaleString()}</small></div></div>)}{!notifications.length && <p className="sc-muted">No notifications yet. When someone follows you, you'll see it here.</p>}</div></>}
    </div>
  </section>;
}

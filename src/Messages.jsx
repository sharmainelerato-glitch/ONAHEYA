import { useCallback, useEffect, useState } from "react";
import "./Messages.css";

const BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
async function request(path, options = {}) {
  const token = localStorage.getItem("onaheya-session");
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || "Something went wrong.");
  return data;
}
function Avatar({ person }) {
  return <div className="om-avatar">{person?.avatarUrl ? <img src={person.avatarUrl} alt="" /> : (person?.displayName || "?").charAt(0).toUpperCase()}</div>;
}
export default function Messages({ profile, onGoProfile, onGoPeople }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [invitees, setInvitees] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const loadConversations = useCallback(async () => {
    const data = await request("/api/messages/conversations");
    setConversations(data.conversations || []);
  }, []);
  const loadActive = useCallback(async (id) => {
    if (!id) return;
    const data = await request(`/api/messages/${encodeURIComponent(id)}`);
    setActive(data.conversation); setMessages(data.messages || []);
  }, []);
  useEffect(() => {
    if (!profile) return;
    let stopped = false;
    async function refresh() {
      try {
        const data = await request("/api/messages/conversations");
        if (!stopped) setConversations(data.conversations || []);
        if (selectedId) {
          const detail = await request(`/api/messages/${encodeURIComponent(selectedId)}`);
          if (!stopped) { setActive(detail.conversation); setMessages(detail.messages || []); }
        }
      } catch (e) { if (!stopped) setError(e.message); }
    }
    refresh();
    // A lightweight development poll; persistent messages remain on the server.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [profile, selectedId]);
  async function act(fn) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function peopleNames(convo) {
    return convo.members.filter(u => u.id !== profile?.id).map(u => u.displayName).join(", ") || "You";
  }
  async function createDirect(event) {
    event.preventDefault();
    await act(async () => {
      const data = await request("/api/messages/direct", { method: "POST", body: JSON.stringify({ username }) });
      setMode(""); setUsername(""); await loadConversations(); setSelectedId(data.conversation.id);
    });
  }
  async function createGroup(event) {
    event.preventDefault();
    await act(async () => {
      const usernames = invitees.split(",").map(v => v.trim().replace(/^@/, "")).filter(Boolean);
      const data = await request("/api/messages/groups", { method: "POST", body: JSON.stringify({ name: groupName, usernames }) });
      setMode(""); setGroupName(""); setInvitees(""); await loadConversations(); setSelectedId(data.conversation.id);
    });
  }
  async function respond(id, accept) {
    await act(async () => {
      await request(`/api/messages/${id}/respond`, { method: "POST", body: JSON.stringify({ accept }) });
      await loadConversations(); if (accept) setSelectedId(id);
    });
  }
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || !active || busy) return;
    const draft = text.trim();
    await act(async () => {
      await request(`/api/messages/${active.id}`, { method: "POST", body: JSON.stringify({ text: draft }) });
      setText(""); await loadActive(active.id); await loadConversations();
    });
  }
  async function invite(event) {
    event.preventDefault();
    if (!active) return;
    await act(async () => {
      await request(`/api/messages/${active.id}/invite`, { method: "POST", body: JSON.stringify({ username: username.replace(/^@/, "") }) });
      setUsername(""); setMode(""); setNotice("Invitation sent. They can accept it in Messages ♡");
      await loadActive(active.id);
    });
  }
  async function leaveGroup() {
    if (!active || !window.confirm("Leave this group?")) return;
    await act(async () => {
      await request(`/api/messages/${active.id}/leave`, { method: "POST", body: "{}" });
      setSelectedId(""); setActive(null); await loadConversations();
    });
  }
  if (!profile) return <section className="om-page screen-panel"><h2>Messages ♡</h2><p>Sign in to connect with your people, even before movie night.</p><button className="primary-btn" onClick={onGoProfile}>Sign in →</button></section>;
  return <section className="om-page screen-panel">
    <div className="om-heading"><p className="eyebrow">DIFFERENT PLACES. SAME CONVERSATION.</p><h2>Messages ♡</h2><p>Stay close before, during and after the credits.</p></div>
    {error && <p className="om-alert" role="alert">{error}</p>}
    {notice && <p className="om-notice" role="status">{notice}</p>}
    <div className="om-layout">
      <aside className="om-sidebar">
        <div className="om-sidebar-title"><strong>Conversations</strong><div><button onClick={() => {setMode("direct");setUsername("");}}>+ Message</button><button onClick={() => setMode("group")}>+ Group</button></div></div>
        {conversations.map(c => <div className="om-conversation-wrap" key={c.id}>
          <button className={`om-conversation ${selectedId === c.id ? "selected" : ""}`} onClick={() => { if (!c.invited) { setSelectedId(c.id); setMode(""); setError(""); } }}>
            <Avatar person={c.type === "direct" ? c.members.find(m => m.id !== profile.id) : {displayName: c.name}} />
            <span><strong>{c.type === "group" ? c.name : peopleNames(c)}</strong><small>{c.invited ? "You're invited ♡" : c.lastMessage?.text || (c.type === "group" ? "Group conversation" : "Say hello!")}</small></span>
          </button>
          {c.invited && <div className="om-invite-actions"><button onClick={() => respond(c.id, true)} disabled={busy}>Accept</button><button onClick={() => respond(c.id, false)} disabled={busy}>Decline</button></div>}
        </div>)}
        {!conversations.length && <p className="om-muted">No conversations yet. Start a chat with a mutual follower or create a group.</p>}
        <button className="om-secondary" onClick={onGoPeople}>Find people ♡</button>
      </aside>
      <div className="om-main">
        {mode === "direct" && <form className="om-form" onSubmit={createDirect}><h3>Start a private conversation ♡</h3><p>For this first version, you must both follow each other.</p><label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. kyle" required /></label><div className="om-actions"><button type="submit" disabled={busy}>Start conversation</button><button type="button" onClick={() => setMode("")}>Cancel</button></div></form>}
        {mode === "group" && <form className="om-form" onSubmit={createGroup}><h3>Create a group ♡</h3><p>Invite people by username—even if they aren't mutual followers. Each person chooses whether to join.</p><label>Group name<input value={groupName} maxLength={60} onChange={e => setGroupName(e.target.value)} placeholder="Movie Night Crew" required /></label><label>Invite usernames (comma-separated)<input value={invitees} onChange={e => setInvitees(e.target.value)} placeholder="kyle, jay, kie" /></label><div className="om-actions"><button disabled={busy}>Create group</button><button type="button" onClick={() => setMode("")}>Cancel</button></div></form>}
        {mode === "invite" && active && <form className="om-form" onSubmit={invite}><h3>Invite someone to {active.name}</h3><p>They can join even if the rest of the group don't follow them.</p><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required placeholder="kie" /></label><div className="om-actions"><button disabled={busy}>Send invitation</button><button type="button" onClick={() => setMode("")}>Cancel</button></div></form>}
        {!mode && active && <>
          <header className="om-chat-header"><div><h3>{active.type === "group" ? active.name : peopleNames(active)}</h3><small>{active.members.map(m => m.displayName).join(", ")}</small></div>{active.type === "group" && <div className="om-header-buttons"><button onClick={() => {setMode("invite");setUsername("");}}>+ Invite</button><button onClick={leaveGroup}>Leave</button></div>}</header>
          {active.type === "group" && !!active.pending?.length && <p className="om-pending">Invited: {active.pending.map(p => p.displayName).join(", ")}</p>}
          <div className="om-messages" role="log" aria-live="polite">
            {messages.map(m => <div className={`om-bubble ${m.senderId === profile.id ? "mine" : ""}`} key={m.id}><small>{m.sender?.displayName || "Member"} · {new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small><p>{m.text}</p></div>)}
            {!messages.length && <p className="om-muted">Your conversation begins here. ♡</p>}
          </div>
          <form className="om-composer" onSubmit={send}><input aria-label="Message" value={text} onChange={e=>setText(e.target.value)} maxLength={1200} placeholder="Write something lovely…" required /><button disabled={busy || !text.trim()}>Send ↗</button></form>
        </>}
        {!mode && !active && <div className="om-empty"><span>♡</span><h3>Conversations make us closer.</h3><p>Select a chat or start a new one. Your messages are saved even when your watch party ends.</p></div>}
      </div>
    </div>
  </section>;
}

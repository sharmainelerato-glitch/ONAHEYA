import "./TapTap.css";
import {demoFilmById} from "./DemoFilms";
import MomentCapsules from "./MomentCapsules";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./RealtimeExperience.css";
import "./AfterglowUpgrade.css";

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;

const MOODS = ["Cozy", "Sunset", "Rainy", "Late Night", "Romance"];
const REACTIONS = ["❤️", "😂", "🥹", "🍿", "👏"];

export default function RealtimeExperience({ onBack, initialAction = null, onEntered }) {
  const socketRef = useRef(null);
  const startupDoneRef = useRef(false);
  const onEnteredRef = useRef(onEntered);
  onEnteredRef.current = onEntered;
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const lastSentRef = useRef(0);
  const [status, setStatus] = useState("Connecting…");
  const [mode, setMode] = useState(initialAction?.mode || "create");
  const [name, setName] = useState(initialAction?.name || "");
  const [nickname, setNickname] = useState(initialAction?.nickname || "");
  const [code, setCode] = useState(initialAction?.code || "");
  const [mood, setMood] = useState(initialAction?.mood || "Cozy");
  const [privacy, setPrivacy] = useState(initialAction?.privacy || "Private");
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState("");
  const [messages, setMessages] = useState([]);
  // Private messages live only in this browser session; never stored in public room state.
  const [privateMessages, setPrivateMessages] = useState([]);
  const [tapsMuted, setTapsMuted] = useState(false);
  const [tapNotice, setTapNotice] = useState(null);
  const [tapFeedback, setTapFeedback] = useState("");
  const tapTimerRef = useRef(null);

  const [selectedPeer, setSelectedPeer] = useState("");
  const [unreadPeers, setUnreadPeers] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [cinema, setCinema] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [companionFeedback, setCompanionFeedback] = useState("");
  const [afterglow, setAfterglow] = useState(false);
  const [sharedMoments, setSharedMoments] = useState([]);
  const [capsulesOpen, setCapsulesOpen] = useState(false);
  const [captureMessage, setCaptureMessage] = useState(null);
  const selectedFilm = demoFilmById(room?.videoId || initialAction?.videoId);
  const VIDEO = selectedFilm.file;
  const isHost = Boolean(room && room.hostId === myId);
  const privateAllowed = room?.allowPrivateMessages !== false;
  const selectedParticipant = room?.participants.find(p => p.id === selectedPeer);
  const visibleMessages = selectedPeer
    ? privateMessages.filter(m =>
        (m.senderId === myId && m.recipientId === selectedPeer) ||
        (m.senderId === selectedPeer && m.recipientId === myId)
      )
    : messages;
  const roomRef = useRef(null);
  const idRef = useRef("");

  const applyPlayback = async (p) => {
    const video = videoRef.current;
    if (!video || !p) return;
    applyingRemoteRef.current = true;
    try {
      const target = Math.max(0, Number(p.position) || 0);
      if (video.readyState > 0 && Math.abs(video.currentTime - target) > 0.9) video.currentTime = target;
      if (p.playing && video.paused) {
        try { await video.play(); }
        catch { setError("Press Play on the video once to allow playback on this device."); }
      } else if (!p.playing && !video.paused) video.pause();
    } finally {
      // Media events may fire asynchronously after current JS stack.
      setTimeout(() => { applyingRemoteRef.current = false; }, 250);
    }
  };

  useEffect(() => {
    const socket = io(SERVER_URL, { reconnectionAttempts: 8 });
    socketRef.current = socket;
    const onConnect = () => {
      setStatus("Connected");
      if (initialAction && !startupDoneRef.current && !roomRef.current) {
        startupDoneRef.current = true;
        const eventName = initialAction.mode === "create" ? "room:create" : "room:join";
        socket.emit(eventName, initialAction, (reply) => {
          if (!reply?.ok) {
            setError(reply?.error || "Could not enter the room.");
            return;
          }
          roomRef.current = reply.room;
          idRef.current = reply.myId;
          setRoom(reply.room);
          setMyId(reply.myId);
          setMessages(reply.room.messages || []);
          setSharedMoments(reply.room.sharedMoments || []);
          setPrivateMessages([]); setSelectedPeer(""); setUnreadPeers([]);
          onEnteredRef.current?.(reply.room);
        });
        return;
      }
      // A reconnect has a new socket ID; rejoin as guest. Server memory is ephemeral.
      if (roomRef.current) {
        socket.emit("room:join", { code: roomRef.current.code, nickname: nickname || initialAction?.nickname || "Guest" }, (reply) => {
          if (!reply?.ok) { setError(reply?.error || "Please rejoin the room."); setRoom(null); roomRef.current = null; return; }
          idRef.current = reply.myId;
          setMyId(reply.myId);
          roomRef.current = reply.room; setRoom(reply.room); setMessages(reply.room.messages || []); setSharedMoments(reply.room.sharedMoments || []);
          applyPlayback(reply.room.playback);
        });
      }
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", () => setStatus("Disconnected — reconnecting…"));
    socket.on("connect_error", () => setStatus("Cannot reach server on port 3001"));
    socket.on("room:update", (next) => {
      roomRef.current = next;
      setRoom(next);
      if (next.allowPrivateMessages === false) setSelectedPeer("");
      setSelectedPeer(prev => prev && !next.participants.some(p => p.id === prev) ? "" : prev);
    });
    socket.on("chat:message", (item) => setMessages(prev => [...prev, item].slice(-100)));
    socket.on("moment:shared", item => setSharedMoments(prev => [...prev.filter(m => m.id !== item.id), item].slice(-30)));
    socket.on("private:message", (item) => {
      setPrivateMessages(prev => [...prev, item].slice(-100));
      // Mark incoming DMs as unread until opened.
      if (item.senderId !== socket.id) {
        setUnreadPeers(prev => prev.includes(item.senderId) ? prev : [...prev, item.senderId]);
      }
    });
    socket.on("taptap:receive", (item) => {
      setTapNotice(item);
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapNotice(null), 6500);
    });
    const sync = (playback) => {
      if (roomRef.current?.hostId !== idRef.current) applyPlayback(playback);
    };
    socket.on("playback:update", sync);
    socket.on("playback:sync", sync);
    const fullscreenChange = () => setCinema(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => {
      clearTimeout(tapTimerRef.current); socket.disconnect(); socketRef.current = null;
      document.removeEventListener("fullscreenchange", fullscreenChange);
    };
    // Connect once when this experience mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enter(e) {
    e.preventDefault(); setError("");
    if (!socketRef.current?.connected) return setError("Start the ONAHEYA server first.");
    const event = mode === "create" ? "room:create" : "room:join";
    const payload = mode === "create"
      ? { name, nickname, mood, privacy }
      : { code: code.toUpperCase(), nickname };
    socketRef.current.emit(event, payload, (reply) => {
      if (!reply?.ok) return setError(reply?.error || "Could not enter the room.");
      roomRef.current = reply.room; idRef.current = reply.myId;
      setRoom(reply.room); setMyId(reply.myId); setMessages(reply.room.messages || []); setSharedMoments(reply.room.sharedMoments || []);
      setPrivateMessages([]); setSelectedPeer(""); setUnreadPeers([]);
      applyPlayback(reply.room.playback);
      onEnteredRef.current?.(reply.room);
    });
  }

  function leave() {
    if (document.fullscreenElement === containerRef.current) document.exitFullscreen().catch(() => {});
    socketRef.current?.emit("room:leave", {});
    roomRef.current = null; idRef.current = "";
    setRoom(null); setMyId(""); setMessages([]); setPrivateMessages([]); setSharedMoments([]); setCapsulesOpen(false);
    setSelectedPeer(""); setUnreadPeers([]); setError("");
  }

  function openChat(peerId = "") {
    setText("");
    setSelectedPeer(peerId);
    if (peerId) setUnreadPeers(prev => prev.filter(id => id !== peerId));
  }

  function send(content, kind = "message") {
    const value = content.trim();
    if (!value) return;
    const privateTarget = selectedPeer && privateAllowed ? selectedPeer : "";
    if (selectedPeer && !privateAllowed) {
      setError("The host has disabled private messaging.");
      return;
    }
    const eventName = privateTarget ? "private:send" : "chat:send";
    const payload = privateTarget
      ? { recipientId: privateTarget, text: value }
      : { text: value, kind };
    socketRef.current?.emit(eventName, payload, (reply) => {
      if (!reply?.ok) setError(reply?.error || "Message not sent.");
      else setText("");
    });
  }


  function sendTap(recipientId, gesture) {
    setTapFeedback("");
    if (!socketRef.current?.connected) return setTapFeedback("Not connected to the room.");
    socketRef.current.emit("taptap:send", { recipientId, gesture }, (reply) => {
      setTapFeedback(reply?.ok ? "A little gesture sent ♡" : (reply?.error || "Tap was not sent."));
    });
  }

  function changeTapMute(next) {
    socketRef.current?.emit("taptap:mute", { muted: next }, (reply) => {
      if (!reply?.ok) return setTapFeedback(reply?.error || "Could not change preference.");
      setTapsMuted(next);
      if (next) setTapNotice(null);
    });
  }

  function updatePrivateMessaging(enabled) {
    setError("");
    socketRef.current?.emit("room:private-setting", { enabled }, (reply) => {
      if (!reply?.ok) setError(reply?.error || "Couldn't change room permissions.");
    });
  }

  function publishPlayback(force = false) {
    const video = videoRef.current;
    if (!isHost || applyingRemoteRef.current || !video) return;
    const now = Date.now();
    if (!force && now - lastSentRef.current < 500) return;
    lastSentRef.current = now;
    socketRef.current?.emit("playback:set", {
      position: video.currentTime, playing: !video.paused && !video.ended,
    });
  }

  async function copyCode() {
    const inviteCode = room?.code;
    if (!inviteCode) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(inviteCode);
      setCopyFeedback(`Copied invitation code: ${inviteCode}`);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = inviteCode;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy rejected");
        setCopyFeedback(`Copied invitation code: ${inviteCode}`);
      } catch {
        setCopyFeedback(`Copy blocked by browser. Select and copy this code: ${inviteCode}`);
      }
    }
  }

  async function toggleCinema() {
    try {
      if (document.fullscreenElement === containerRef.current) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch { setError("Your browser blocked fullscreen."); }
  }

  return (
    <section className={`ona-live ${room ? `ona-live-${room.mood.toLowerCase().replace(/\s+/g, "-")}` : ""} ${cinema ? "ona-cinema" : ""}`} ref={containerRef}>
      {!room ? (
        <div className="ona-lobby">
          <p className="ona-eyebrow">♡ ONAHEYA TOGETHERSPACE · REAL-TIME BETA</p>
          <h2>Different places. Same room.</h2>
          <p className="ona-intro">Create a shared cinema or join your friends using a code.</p>
          <div className="ona-modes">
            <button className={mode === "create" ? "chosen" : ""} onClick={() => setMode("create")}>Create room</button>
            <button className={mode === "join" ? "chosen" : ""} onClick={() => setMode("join")}>Join with code</button>
          </div>
          <form className="ona-lobby-form" onSubmit={enter}>
            <label>Your name <input maxLength={32} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Lerato" required /></label>
            {mode === "create" ? <>
              <label>Room name <input maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder="Friday Movie Night" required /></label>
              <label>Room mood <select value={mood} onChange={e => setMood(e.target.value)}>{MOODS.map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Privacy <select value={privacy} onChange={e => setPrivacy(e.target.value)}><option>Private</option><option>Public</option></select></label>
            </> : <label>Six-character code <input maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC123" required /></label>}
            <button className="ona-main-action" type="submit">{mode === "create" ? "Create shared room →" : "Join room →"}</button>
          </form>
          <p className="ona-connection">{status}</p>
          {error && <p className="ona-error" role="alert">{error}</p>}
          {onBack && <button className="ona-plain" onClick={onBack}>← Back to ONAHEYA</button>}
        </div>
      ) : <>
        <header className="ona-live-head">
          <div><button className="ona-plain" onClick={() => { leave(); onBack?.(); }}>← My Rooms</button><p className="ona-eyebrow">♡ LIVE SHARED CINEMA</p><h2>{room.name}</h2></div>
          <div className="ona-live-controls"><span>{room.mood} · {room.privacy}</span><button type="button" onClick={copyCode} title="Copy room invitation code">📋 Copy code: <strong>{room.code}</strong></button><button type="button" onClick={async () => {
              const url = `${window.location.origin}${window.location.pathname}?companion=${room.code}`;
              try { await navigator.clipboard.writeText(url); setCompanionFeedback("Phone link copied ♡"); }
              catch { setCompanionFeedback(`Open on your phone: ${url}`); }
            }}>♡ Phone companion</button>{companionFeedback && <span role="status" style={{fontSize:12,overflowWrap:"anywhere"}}>{companionFeedback}</span>}<button onClick={toggleCinema}>{cinema ? "Exit cinema" : "⛶ Cinema mode"}</button></div>
        </header>
        <div className="ona-live-grid">
          <div className="ona-video-col">
            <div className="ona-video-shell">
              <video
                ref={videoRef} key={selectedFilm.id} src={VIDEO} controls={isHost || cinema} playsInline preload="metadata"
                onPlay={() => publishPlayback(true)}
                onPause={() => publishPlayback(true)}
                onSeeked={() => publishPlayback(true)}
                onLoadedMetadata={() => applyPlayback(room?.playback)}
                onError={() => setError(`Can't load ${selectedFilm.title}. Add its video file at public${VIDEO} and refresh.`)}
                onEnded={() => { setAfterglow(true); if(isHost) publishPlayback(false); }}
              />
              {!isHost && !cinema && <div className="ona-guest-label">Host controls playback · You follow automatically</div>}
            </div>
            <MomentCapsules
              room={room}
              nickname={nickname}
              position={videoRef.current?.currentTime || 0}
              participants={room.participants}
              sharedMoments={sharedMoments}
              active={capsulesOpen}
              onToggle={() => setCapsulesOpen(open => !open)}
              captureMessage={captureMessage}
              onCaptureConsumed={() => setCaptureMessage(null)}
              onShare={(moment, done) => socketRef.current?.emit("moment:share", moment, done)}
            />
            <div className="ona-below-video">
              <div><strong>{isHost ? "★ You're the host" : `★ Host: ${room.hostName}`}</strong><small>Everyone watches the same timeline</small></div>
              <div className="ona-people">{room.participants.map(p => <span key={p.id}>{p.host ? "★ " : "♡ "}{p.name}{p.id === myId ? " (you)" : ""}</span>)}</div>
            </div>
          </div>
          <aside className="ona-social">
            <div className="ona-social-title">
              <span>THE CONVERSATION</span>
              <h3>{selectedParticipant ? `♡ ${selectedParticipant.name}` : "Room Chat ♡"}</h3>
              <small>{room.participants.length} connected · {privateAllowed ? "Private chat allowed" : "Private chat off"}</small>
            </div>
            {isHost && (
              <label className="ona-host-setting">
                <span>Allow private messages</span>
                <input
                  type="checkbox"
                  checked={privateAllowed}
                  onChange={e => updatePrivateMessaging(e.target.checked)}
                />
              </label>
            )}

            <section className="ona-taptap" aria-label="TapTap private gestures">
              <div className="ona-taptap-heading"><div><strong>♡ TapTap</strong><small>A small way to say I'm here, just to one person.</small></div><label><input type="checkbox" checked={tapsMuted} onChange={e => changeTapMute(e.target.checked)} /> Mute incoming taps</label></div>
              {room.participants.filter(person => person.id !== myId).length === 0 ? <p className="ona-taptap-hint">Invite someone to send your first TapTap.</p> :
                room.participants.filter(person => person.id !== myId).map(person => <div className="ona-taptap-person" key={person.id}>
                  <span>{person.name}</span><div>
                    <button type="button" onClick={() => sendTap(person.id, "heart")} aria-label={`Send ${person.name} a heart`}>♡ Heart</button>
                    <button type="button" onClick={() => sendTap(person.id, "squeeze")} aria-label={`Send ${person.name} a hand squeeze`}>🤝 Squeeze</button>
                    <button type="button" onClick={() => sendTap(person.id, "here")} aria-label={`Tell ${person.name} I'm here`}>✨ I'm here</button>
                  </div></div>)}
              {tapFeedback && <p className="ona-taptap-hint" role="status">{tapFeedback}</p>}
            </section>
            {tapNotice && !tapsMuted && <div className="ona-taptap-toast" role="status" aria-live="polite"><span>{tapNotice.symbol}</span><div><strong>{tapNotice.senderName} sent a TapTap</strong><small>{tapNotice.gesture === "squeeze" ? "A little hand squeeze" : tapNotice.gesture === "here" ? "I'm here with you" : "Sending you a little heart"}</small><button type="button" onClick={() => { sendTap(tapNotice.senderId, tapNotice.gesture); setTapNotice(null); }}>Tap back ♡</button></div><button type="button" aria-label="Dismiss" onClick={() => setTapNotice(null)}>×</button></div>}
            <div className="ona-chat-tabs" aria-label="Choose conversation">
              <button
                type="button"
                className={!selectedPeer ? "active" : ""}
                onClick={() => openChat()}
              >Everyone</button>
              {room.participants.filter(p => p.id !== myId).map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={selectedPeer === p.id ? "active" : ""}
                  disabled={!privateAllowed}
                  title={privateAllowed ? `Private chat with ${p.name}` : "Host disabled private messages"}
                  onClick={() => openChat(p.id)}
                >
                  ♡ {p.name}{unreadPeers.includes(p.id) ? " •" : ""}
                </button>
              ))}
            </div>
            <div className="ona-messages" role="log" aria-live="polite">
              <p className="ona-system">
                {selectedParticipant
                  ? `Only you and ${selectedParticipant.name} can see these messages. They won't appear in room chat.`
                  : "You're together now. Say hello! 🏡"}
              </p>
              {visibleMessages.map(m => (
                <div className={`ona-message ${m.senderId === myId ? "self" : ""}`} key={m.id}>
                  <small>{m.author || m.senderName} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                  <p className={m.kind === "reaction" ? "ona-reaction" : ""}>{m.text}</p>
                  {m.kind !== "reaction" && <button type="button" className="ona-save-message" onClick={() => {
                    setCaptureMessage({ text: m.text, fromPrivateChat: Boolean(selectedPeer) });
                    setCapsulesOpen(true);
                  }} title="Save a personal memory">♡ Save moment</button>}
                </div>
              ))}
            </div>
            <div className="ona-compose">
              {!selectedPeer && (
                <div className="ona-emojis">
                  {REACTIONS.map(r => (
                    <button key={r} type="button" aria-label={`React ${r}`} onClick={() => send(r, "reaction")}>{r}</button>
                  ))}
                </div>
              )}
              <form onSubmit={e => { e.preventDefault(); send(text); }}>
                <input
                  aria-label={selectedParticipant ? "Private message" : "Room message"}
                  value={text}
                  maxLength={500}
                  onChange={e => setText(e.target.value)}
                  placeholder={selectedParticipant ? `Message ${selectedParticipant.name} privately…` : "Chat with everyone…"}
                  disabled={Boolean(selectedPeer) && !privateAllowed}
                />
                <button type="submit" disabled={!text.trim() || (Boolean(selectedPeer) && !privateAllowed)}>Send</button>
              </form>
            </div>
          </aside>
        </div>
        {afterglow && !cinema && <div className="ona-afterglow" role="region" aria-label="Afterglow lounge">
          <p>✦ AFTERGLOW ♡</p><h3>The movie has ended. The moment doesn't have to.</h3>
          <p>Stay in the room, share your favourite scene or plan your next watch night together.</p>
          <button type="button" onClick={()=>{setAfterglow(false);setCapsulesOpen(true);}}>♡ Open Moment Capsules</button>
          <button type="button" onClick={()=>{setAfterglow(false);openChat();}}>♡ Keep chatting</button>
          <button type="button" onClick={()=>{setAfterglow(false);if(isHost && videoRef.current){videoRef.current.currentTime=0; publishPlayback(false);}}}>Close</button>
        </div>}
        {copyFeedback && <p className="ona-copy" role="status">{copyFeedback}</p>}
        {error && <p className="ona-error" role="alert">{error}</p>}
        {!cinema && <p className="ona-footnote">Live beta · Video must exist at {VIDEO} on every device · Rooms disappear when server restarts</p>}
      </>}
    </section>
  );
}

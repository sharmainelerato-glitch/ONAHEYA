import "./TapTap.css";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./TogetherSpace.css";

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;
const REACTIONS = ["❤️", "😂", "🥹", "🍿", "👏"];

export default function TogetherSpace({ initialCode = "" }) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 6));
  const [nickname, setNickname] = useState(() => sessionStorage.getItem("onaheya-companion-name") || "");
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState("");
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("");
  const [privateMessages, setPrivateMessages] = useState([]);
  const [tapsMuted, setTapsMuted] = useState(false);
  const [tapNotice, setTapNotice] = useState(null);
  const [tapFeedback, setTapFeedback] = useState("");
  const tapTimerRef = useRef(null);

  const socketRef = useRef(null);
  const joinedRef = useRef(null);
  const feedRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { reconnectionAttempts: 8 });
    socketRef.current = socket;
    const rejoin = () => {
      setStatus("Connected");
      if (joinedRef.current) {
        socket.emit("room:join", joinedRef.current, (reply) => {
          if (!reply?.ok) {
            setRoom(null);
            setError(reply?.error || "Could not reconnect to the room.");
            return;
          }
          setMyId(reply.myId);
          setRoom(reply.room);
          setMessages(reply.room.messages || []);
        });
      }
    };
    socket.on("connect", rejoin);
    socket.on("disconnect", () => setStatus("Reconnecting…"));
    socket.on("connect_error", () => setStatus("Cannot reach the room server. Check your Wi-Fi and LAN settings."));
    socket.on("room:update", (next) => {
      setRoom(next);
      setSelectedPeer((peer) => peer && (next.allowPrivateMessages === false || !next.participants.some(p => p.id === peer)) ? "" : peer);
    });
    socket.on("chat:message", (item) => setMessages(previous => [...previous, item].slice(-100)));
    socket.on("private:message", (item) => setPrivateMessages(previous => [...previous, item].slice(-100)));
    socket.on("taptap:receive", (item) => {
      setTapNotice(item);
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapNotice(null), 6500);
    });

    return () => { clearTimeout(tapTimerRef.current); socket.disconnect(); socketRef.current = null; };
  }, []);

  const visibleMessages = selectedPeer
    ? privateMessages.filter(item =>
        (item.senderId === myId && item.recipientId === selectedPeer) ||
        (item.senderId === selectedPeer && item.recipientId === myId))
    : messages;

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length, selectedPeer]);

  function join(event) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const name = nickname.trim();
    if (!/^[A-Z2-9]{6}$/.test(normalizedCode) || !name) {
      setError("Enter your six-character room code and display name.");
      return;
    }
    if (!socketRef.current?.connected) {
      setError("Not connected to ONAHEYA. Make sure the server is running.");
      return;
    }
    setError("");
    const payload = { code: normalizedCode, nickname: name };
    socketRef.current.emit("room:join", payload, (reply) => {
      if (!reply?.ok) return setError(reply?.error || "Room not found.");
      joinedRef.current = payload;
      sessionStorage.setItem("onaheya-companion-name", name);
      setMyId(reply.myId);
      setRoom(reply.room);
      setMessages(reply.room.messages || []);
      setPrivateMessages([]);
    });
  }

  function send(event, reaction = null) {
    event?.preventDefault?.();
    const content = (reaction || message).trim();
    if (!content || !room) return;
    const isPrivate = Boolean(selectedPeer);
    socketRef.current?.emit(isPrivate ? "private:send" : "chat:send",
      isPrivate ? { recipientId: selectedPeer, text: content } : { text: content, kind: reaction ? "reaction" : "message" },
      (reply) => {
        if (!reply?.ok) return setError(reply?.error || "Message not sent.");
        setMessage("");
        setError("");
      }
    );
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

  function leave() {
    socketRef.current?.emit("room:leave", {}, () => {});
    joinedRef.current = null;
    setRoom(null);
    setMyId("");
    setSelectedPeer("");
    setMessages([]);
    setPrivateMessages([]);
  }

  return (
    <main className="ts-app">
      <div className="ts-shell">
        <header className="ts-brand"><span className="ts-logo">♡</span><div><strong>ONAHEYA</strong><small>TOGETHERSPACE · PHONE COMPANION</small></div></header>
        {!room ? (
          <section className="ts-join">
            <span className="ts-eyebrow">DIFFERENT PLACES. SAME ROOM.</span>
            <h1>Your seat is waiting <span>♡</span></h1>
            <p>Keep the movie on the big screen. Bring the conversation to your phone.</p>
            <form onSubmit={join}>
              <label>Room code<input autoCapitalize="characters" maxLength={6} placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label>
              <label>Your name<input maxLength={32} placeholder="How should friends see you?" value={nickname} onChange={e => setNickname(e.target.value)} /></label>
              <button className="ts-primary" type="submit">Join movie night →</button>
            </form>
            <p className="ts-status">{status}</p>
            {error && <p className="ts-error" role="alert">{error}</p>}
            <p className="ts-note">This companion joins as a separate guest. It cannot pause or skip the movie.</p>
          </section>
        ) : (
          <section className="ts-room">
            <div className="ts-room-head"><span className="ts-live">● LIVE TOGETHER</span><button className="ts-quiet" type="button" onClick={leave}>Leave room</button></div>
            <h1>{room.name}</h1>
            <p className="ts-meta">{room.mood} mood · {room.participants.length} here · #{room.code}</p>
            <div className="ts-watching"><span>▸</span><div><strong>Watching together</strong><small>Playback stays on your TV or computer.</small></div></div>
            <div className="ts-people">{room.participants.map(person => <span key={person.id} title={person.name}>{person.name}{person.host ? " ✦" : ""}</span>)}</div>

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
            <div className="ts-chat-head"><strong>{selectedPeer ? "Private conversation" : "Room conversation ♡"}</strong><span>{status}</span></div>
            <label className="ts-conversation-select">Chat with
              <select value={selectedPeer} onChange={e => setSelectedPeer(e.target.value)}>
                <option value="">Everyone in the room</option>
                {room.allowPrivateMessages !== false && room.participants.filter(person => person.id !== myId).map(person => <option key={person.id} value={person.id}>{person.name} (private)</option>)}
              </select>
            </label>
            <div className="ts-feed" ref={feedRef} aria-live="polite">
              {visibleMessages.length === 0 ? <p className="ts-empty">The best movie nights start with a hello. ♡</p> : visibleMessages.map(item => (
                <div className={`ts-bubble ${item.senderId === myId ? "ts-mine" : ""}`} key={item.id}><small>{item.senderName || item.author || "Friend"}</small><p>{item.text}</p></div>
              ))}
            </div>
            <div className="ts-reactions" aria-label="Quick reactions">{REACTIONS.map(reaction => <button key={reaction} type="button" onClick={() => send(null, reaction)} title={`Send ${reaction}`}>{reaction}</button>)}</div>
            <form className="ts-compose" onSubmit={send}><input maxLength={500} value={message} onChange={e => setMessage(e.target.value)} placeholder={selectedPeer ? "Send privately…" : "Say something lovely…"} aria-label="Message" /><button type="submit" aria-label="Send message">➤</button></form>
            {error && <p className="ts-error" role="alert">{error}</p>}
            <p className="ts-footnote">♡ You are here for the moment, not to manage the screen.</p>
          </section>
        )}
      </div>
    </main>
  );
}

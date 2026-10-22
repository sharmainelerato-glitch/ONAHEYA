
import { useRef, useState } from "react";
import "./WatchPartyRoom.css";

const DEMO_VIDEO = "/videos/onaheya-demo.mov";

const MOOD_CLASSES = {
  Cozy: "mood-cozy",
  Sunset: "mood-sunset",
  Rainy: "mood-rainy",
  "Late Night": "mood-late-night",
  Romance: "mood-romance",
};

const REACTIONS = ["❤️", "😂", "🥹", "😍", "🍿", "👏"];

function WatchPartyRoom({
  room,
  onBack,
  onCopyCode,
  decorations,
}) {
  const videoRef = useRef(null);
  const messageEndRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [chatOpen, setChatOpen] = useState(true);

  const moodClass = MOOD_CLASSES[room.mood] || "mood-cozy";

  const addMessage = (content, type = "message") => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const newMessage = {
      id: crypto.randomUUID(),
      author: "You",
      content: trimmed,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((previous) => [...previous, newMessage]);
    setMessage("");

    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const sendMessage = (event) => {
    event.preventDefault();
    addMessage(message);
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setFeedback("");
      } catch {
        setFeedback("Unable to play the demo video.");
      }
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setFeedback("Invitation code copied!");
    } catch {
      setFeedback(`Your invitation code is ${room.code}`);
    }

    onCopyCode?.(room.code);
  };

  return (
    <section
      className={`watch-party-screen ${moodClass}`}
      aria-label={`${room.name} watch party`}
    >
      <div className="watch-party-atmosphere">
        {decorations}
      </div>

      <div className="watch-party-content">

        {/* TOP BAR */}

        <header className="watch-party-header">
          <div className="watch-party-heading">
            <button
              type="button"
              className="watch-back-button"
              onClick={onBack}
            >
              ← My Watch Parties
            </button>

            <div className="watch-party-title-row">
              <div>
                <p className="watch-party-eyebrow">
                  YOUR SHARED CINEMA ♡
                </p>
                <h1>{room.name}</h1>
              </div>
            </div>
          </div>

          <div className="watch-party-header-actions">
            <span className="watch-room-chip">
              ✦ {room.mood}
            </span>

            <span className="watch-room-chip">
              {room.privacy === "Private" ? "🔒" : "🌍"}{" "}
              {room.privacy}
            </span>

            <button
              type="button"
              className="watch-invite-button"
              onClick={copyInvite}
            >
              <span>Copy Invite</span>
              <strong>{room.code}</strong>
            </button>
          </div>
        </header>

        {/* MAIN WORKSPACE */}

        <div
          className={`watch-party-layout ${
            chatOpen ? "" : "chat-hidden"
          }`}
        >
          <div className="watch-player-column">

            {/* VIDEO PLAYER */}

            <div className="watch-player-card">
              <div className="watch-player-topline">
                <span className="watch-now-playing">
                  <span className="watch-status-dot" />
                  NOW PLAYING
                </span>

                <span className="watch-demo-label">
                  Demo cinema
                </span>
              </div>

              <div className="watch-video-frame">
                <video
                  ref={videoRef}
                  src={DEMO_VIDEO}
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onVolumeChange={(event) =>
                    setMuted(event.currentTarget.muted)
                  }
                  onError={() =>
                    setFeedback(
                      "The demo video could not load. Check your connection."
                    )
                  }
                  aria-label="ONAHEYA demonstration video"
                />
              </div>

              <div className="watch-player-bottom">
                <div className="watch-film-info">
                  <span>✦ SHARED SCREEN</span>
                  <h2>A Little Moment Together</h2>
                  <p>
                    A short sample video to test your
                    watch room.
                  </p>
                </div>

                <div className="watch-playback-buttons">
                  <button
                    type="button"
                    onClick={togglePlayback}
                    className="watch-control-button primary"
                  >
                    {playing ? "⏸ Pause" : "▶ Play"}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="watch-control-button"
                  >
                    {muted ? "🔇 Unmute" : "🔊 Mute"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatOpen(!chatOpen)}
                    className="watch-control-button"
                    aria-expanded={chatOpen}
                  >
                    {chatOpen ? "Hide Chat" : "Show Chat"}
                  </button>
                </div>
              </div>
            </div>

            {/* PEOPLE & INVITATION */}

            <div className="watch-room-bottom">
              <div className="watch-participants">
                <span className="watch-small-heading">
                  IN THIS ROOM
                </span>

                <div className="watch-person">
                  <span className="watch-person-avatar">
                    Y
                  </span>

                  <div>
                    <strong>You</strong>
                    <small>Viewing locally</small>
                  </div>

                  <span className="watch-person-online" />
                </div>
              </div>

              <div className="watch-room-message">
                <span>♡</span>
                <p>
                  Different places.
                  <br />
                  <strong>Same room.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* CHAT */}

          {chatOpen && (
            <aside className="watch-chat-panel">
              <div className="watch-chat-header">
                <div>
                  <span className="watch-small-heading">
                    THE CONVERSATION
                  </span>
                  <h2>Room Chat ♡</h2>
                </div>

                <span className="watch-chat-status">
                  Local demo
                </span>
              </div>

              <div
                className="watch-chat-messages"
                role="log"
                aria-label="Room chat messages"
                aria-live="polite"
              >
                <div className="watch-welcome-message">
                  <span>🏡</span>
                  <h3>Welcome home!</h3>
                  <p>
                    Your cozy movie night starts here.
                    Send a message or reaction.
                  </p>
                </div>

                {messages.map((item) => (
                  <div
                    className={`watch-message ${
                      item.type === "reaction"
                        ? "watch-reaction-message"
                        : ""
                    }`}
                    key={item.id}
                  >
                    <div className="watch-message-meta">
                      <strong>{item.author}</strong>
                      <small>{item.time}</small>
                    </div>

                    <p>{item.content}</p>
                  </div>
                ))}

                <div ref={messageEndRef} />
              </div>

              <div className="watch-chat-composer">
                <div
                  className="watch-reactions"
                  aria-label="Quick reactions"
                >
                  {REACTIONS.map((reaction) => (
                    <button
                      type="button"
                      key={reaction}
                      aria-label={`React with ${reaction}`}
                      onClick={() =>
                        addMessage(reaction, "reaction")
                      }
                    >
                      {reaction}
                    </button>
                  ))}
                </div>

                <form onSubmit={sendMessage}>
                  <label
                    htmlFor="watch-chat-input"
                    className="watch-visually-hidden"
                  >
                    Message
                  </label>

                  <input
                    id="watch-chat-input"
                    type="text"
                    placeholder="Say something lovely..."
                    value={message}
                    maxLength={500}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                  />

                  <button
                    type="submit"
                    disabled={!message.trim()}
                    aria-label="Send message"
                  >
                    ➤
                  </button>
                </form>
              </div>
            </aside>
          )}
        </div>

        {feedback && (
          <div
            className="watch-party-feedback"
            role="status"
          >
            {feedback}
          </div>
        )}

        <div className="watch-party-disclaimer">
          Local preview · Messages and playback are not
          yet synchronized across devices.
        </div>
      </div>
    </section>
  );
}

export default WatchPartyRoom;


import { useEffect, useState } from "react";
import "./App.css";
import OnaheyaConfirm from "./OnaheyaConfirm";
import "./AboutUpgrade.css";
import "./RoomsUpgrade.css";
import WatchPartyRoom from "./WatchPartyRoom";
import RealtimeExperience from "./RealtimeExperience";
import TogetherSpace from "./TogetherSpace";
import AccountProfile from "./AccountProfile";
import ProfileHome from "./ProfileHome";
import SocialConnections from "./SocialConnections";
import Messages from "./Messages";
import DiscoverDates from "./DiscoverDates";
import BrowseStories from "./BrowseStories";
import { SharedWatchlists, BookDiscussion } from "./StorySocial";
import { DEMO_FILMS } from "./DemoFilms";
import { bookForFilm } from "./BookLibrary";
import BookReader from "./BookReader";
import OfflineDownloads from "./OfflineDownloads";
import OnaheyaGuide from "./OnaheyaGuide";

/* =========================================
   ONAHEYA — CONTENT
========================================= */

const features = [
  {
    title: "Watch Together",
    text: "Sync your favorite movies and shows in real time with friends near or far.",
    icon: "👥",
  },
  {
    title: "Live Chat",
    text: "React, chat, and share the moment because everything is better together.",
    icon: "💬",
  },
  {
    title: "Across Devices",
    text: "Watch on web, mobile, or TV. Different places, same experience.",
    icon: "🖥️",
  },
  {
    title: "Your Space",
    text: "Create your own rooms, customize the vibe, and make it feel like home.",
    icon: "🏠",
  },
];

const rooms = [
  {
    title: "Cozy Movie Night",
    tags: ["Movies", "Chill", "Friends"],
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Studio Ghibli Evenings",
    tags: ["Anime", "Feel Good", "Cozy"],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "TV Show Club",
    tags: ["Series", "Discussion", "Community"],
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Late Night Vibes",
    tags: ["Music", "Hangout", "Chill"],
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Romance & Feel Good",
    tags: ["Romance", "Cozy", "Movies"],
    image: "/images/shared-room.jpg",
  },
];

const participants = [
  {
    city: "Tokyo",
    position: "top-left",
    image: "/images/tokyo.jpg",
  },
  {
    city: "Seoul",
    position: "top-right",
    image: "/images/seoul.jpg",
  },
  {
    city: "New York",
    position: "bottom-left",
    image: "/images/newyork.jpg",
  },
  {
    city: "London",
    position: "bottom-right",
    image: "/images/london.jpg",
  },
];

const navigation = [
  ["Home", "home"],
  ["Browse", "browse"],
  ["Features", "features"],
  ["My Rooms", "rooms"],
  ["Community", "community"],
  ["My Space", "library"],
];

/* =========================================
   ROOM MOOD THEMES
========================================= */

const roomMoodThemes = {
  Cozy: {
    className: "mood-cozy",
    label: "Warm and welcoming",
    description:
      "Soft lighting, warm tones, and a cozy movie-night feeling.",
  },
  Sunset: {
    className: "mood-sunset",
    label: "Golden hour glow",
    description:
      "A dreamy sunset-inspired room for beautiful shared evenings.",
  },
  Rainy: {
    className: "mood-rainy",
    label: "Calm and comforting",
    description:
      "A peaceful rainy-day atmosphere with a soothing indoor vibe.",
  },
  "Late Night": {
    className: "mood-late-night",
    label: "After-dark cinema",
    description:
      "Dim lights, deep tones, and a proper late-night watch-party mood.",
  },
  Romance: {
    className: "mood-romance",
    label: "Soft and intimate",
    description:
      "Blush tones, gentle light, and a feel-good romantic atmosphere.",
  },
};

/* =========================================
   LOCAL ROOM HELPERS
========================================= */

function loadSavedRooms() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("onaheya-rooms") || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function makeRoomCode(existingRooms) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;

  do {
    const random = new Uint32Array(6);
    crypto.getRandomValues(random);

    code = Array.from(
      random,
      (number) => alphabet[number % alphabet.length]
    ).join("");
  } while (
    existingRooms.some((room) => room.code === code)
  );

  return code;
}

/* =========================================
   LIVE MOOD DECORATIONS
========================================= */

function MoodDecorations({ mood }) {
  return (
    <div className="mood-decorations" aria-hidden="true">
      {mood === "Cozy" && (
        <div className="cozy-particles">
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className="golden-sparkle"
            />
          ))}
        </div>
      )}

      {mood === "Sunset" && (
        <div className="sunset-decor">
          <div className="sunset-sun" />
          <div className="sunset-rays" />
        </div>
      )}

      {mood === "Rainy" && (
        <div className="rain-decor">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="rain-drop"
            />
          ))}
        </div>
      )}

      {mood === "Late Night" && (
        <div className="night-decor">
          <div className="night-moon">☾</div>

          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="night-star"
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {mood === "Romance" && (
        <div className="romance-decor">
          <div className="romance-candle">
            <span className="candle-flame" />
            <span className="candle-body" />
          </div>

          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="romance-heart"
            >
              ♥
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================
   LIVE ROOM PREVIEW WITH REAL IMAGES
========================================= */

function LiveRoomPreview({
  roomName,
  roomMood,
  roomPrivacy,
  currentMoodTheme,
}) {
  return (
    <aside
      className={`live-room-preview ${currentMoodTheme.className}`}
    >
      <div className="preview-badge">
        LIVE ROOM PREVIEW
      </div>

      <div className="preview-room-name">
        {roomName.trim() || "Your Room Name"}
      </div>

      <div className="preview-room-subtitle">
        {currentMoodTheme.label}
      </div>

      <p className="preview-room-description">
        {currentMoodTheme.description}
      </p>

      <div className="preview-mini-room">
        {/* Animated mood decorations */}
        <MoodDecorations mood={roomMood} />

        {/* Actual participant photos */}
        {participants.map((person) => (
          <div
            key={person.city}
            className={`preview-floating-card preview-${person.position}`}
          >
            <img
              src={person.image}
              alt={`${person.city} participant`}
            />

            <span>{person.city}</span>
          </div>
        ))}

        {/* Shared television image */}
        <div className="preview-tv preview-tv-image">
          <img
            src="/images/shared-room.jpg"
            alt="Shared watch room"
          />

          <div className="preview-tv-overlay">
            <span>Same room</span>
            <small>Different places</small>
          </div>
        </div>
      </div>

      <div className="preview-meta">
        <span>{roomMood}</span>
        <span>{roomPrivacy}</span>
      </div>
    </aside>
  );
}

/* =========================================
   MAIN APPLICATION
========================================= */

const getAliceBook = () => bookForFilm(DEMO_FILMS.find(f => f.id === "alice-1903"));

function App() {
  const [activePage, setActivePage] = useState("home");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pageHistory, setPageHistory] = useState([]);
  const [pendingFilmTitle, setPendingFilmTitle] = useState("");
  const [readingBook, setReadingBook] = useState(null);
  const [selectedBrowseFilm, setSelectedBrowseFilm] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Room state */
  const [myRooms, setMyRooms] = useState(loadSavedRooms);
  const [roomName, setRoomName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem("onaheya-session");
    if (!token) return;
    fetch(`${import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => { if (!res.ok) throw Error("Session expired"); return res.json(); })
      .then(({ profile }) => { setProfile(profile); setDisplayName(profile.displayName); })
      .catch(() => { localStorage.removeItem("onaheya-session"); });
  }, []);
  const [roomMood, setRoomMood] = useState("Cozy");
  const [roomPrivacy, setRoomPrivacy] = useState("Private");
  const [roomError, setRoomError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [foundRoom, setFoundRoom] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [liveAction, setLiveAction] = useState(null);

  const currentMoodTheme =
    roomMoodThemes[roomMood] || roomMoodThemes.Cozy;

  /* Navigation: Profile remembers exactly where it was opened from. */
  const [profileOrigin, setProfileOrigin] = useState("home");
  const navigate = (page) => {
    // Going from Edit Profile or Settings to Profile must NOT overwrite
    // the original Home / Browse / Community / My Space destination.
    if (page === "profile" && !["profile", "edit-profile", "settings"].includes(activePage)) {
      setProfileOrigin(activePage);
    }
    if (page !== activePage) setPageHistory((previous) => [...previous, activePage].slice(-30));
    setActivePage(page);
    setMobileMenuOpen(false);
    setRoomError("");
    setCopyMessage("");
  };
  const goBack = () => {
    if (activePage === "profile") {
      const destination = profileOrigin && profileOrigin !== "profile" ? profileOrigin : "home";
      setPageHistory((previous) => {
        const index = previous.lastIndexOf(destination);
        return index >= 0 ? previous.slice(0, index) : [];
      });
      setActivePage(destination);
      setMobileMenuOpen(false);
      return;
    }
    setPageHistory((previous) => {
      if (!previous.length) { setActivePage("home"); return []; }
      setActivePage(previous[previous.length - 1]);
      return previous.slice(0, -1);
    });
    setMobileMenuOpen(false);
  };

  /* Save rooms in browser */
  useEffect(() => {
    try {
      localStorage.setItem(
        "onaheya-rooms",
        JSON.stringify(myRooms)
      );
    } catch (error) {
      console.error("Unable to save rooms:", error);
    }
  }, [myRooms]);

  /* Create a real shared room using the server (server assigns invite code). */
  const createRoom = (event) => {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return setRoomError("Please give your room a name.");
    if (name.length > 50) return setRoomError("Your room name is too long.");
    const nickname = profile?.displayName || displayName.trim();
    if (!nickname) return setRoomError("Please enter your display name.");
    setLiveAction({ mode: "create", name, mood: roomMood, privacy: roomPrivacy, nickname });
    setRoomError("");
    navigate("realtime");
  };

  /* Save server-confirmed rooms locally for the My Watch Parties cards. */
  const rememberLiveRoom = (serverRoom) => {
    if (liveAction?.movieDateId && liveAction.mode === "create") {
      fetch(`${import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"}/api/movie-dates/${liveAction.movieDateId}/room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("onaheya-session")}` },
        body: JSON.stringify({code:serverRoom.code})
      }).then(async response => {
        if (!response.ok) throw new Error((await response.json()).error || "Unable to link room");
      }).catch(error => window.alert(`Movie date link failed: ${error.message}. Share the room code manually.`));
    }
    setMyRooms((previous) => {
      const saved = {
        id: `live-${serverRoom.code}`,
        code: serverRoom.code,
        name: serverRoom.name,
        mood: serverRoom.mood,
        privacy: serverRoom.privacy,
        createdAt: new Date().toISOString(),
        live: true,
      };
      return [saved, ...previous.filter((entry) => entry.code !== saved.code)];
    });
  };

  const launchLiveJoin = (code) => {
    const nickname = profile?.displayName || displayName.trim();
    if (!nickname) {
      setJoinError("Please enter your name before joining.");
      return;
    }
    setLiveAction({ mode: "join", code: code.trim().toUpperCase(), nickname });
    navigate("realtime");
  };

  /* Copy invitation code */
  const copyRoomCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMessage(`Code ${code} copied!`);
    } catch {
      setCopyMessage(
        `Your invitation code is ${code}.`
      );
    }
  };


/* Room codes now resolve on the server, including codes from another device. */
  const findRoomByCode = (event) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setJoinError("Enter your six-character invitation code.");
      return;
    }
    setJoinError("");
    launchLiveJoin(code);
  };

  const companionCode = new URLSearchParams(window.location.search).get("companion");
  if (companionCode !== null) return <TogetherSpace initialCode={companionCode} />;

  return (
    <div className="app landing-page">

      <OnaheyaGuide onNavigate={navigate} onOpenFilm={(film) => { setSelectedBrowseFilm(film); navigate("browse"); }} />

      {/* ===================================
          NAVIGATION BAR
      =================================== */}

      <header className="navbar">
        <button
          className="brand brand-button"
          type="button"
          onClick={() => navigate("home")}
          aria-label="ONAHEYA home"
        >
          <img
            src="/branding/logo.png"
            alt="ONAHEYA"
            className="onaheya-navbar-logo"
          />
        </button>

        <nav
          className="nav-links"
          aria-label="Main navigation"
        >
          {navigation.map(([label, page]) => (
            <button
              key={label}
              type="button"
              className={`nav-tab ${
                activePage === page
                  ? "selected"
                  : ""
              }`}
              onClick={() => navigate(page)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="navbar-actions">
          <button type="button" className="secondary-btn ona-header-messages" onClick={() => navigate("messages")}>✉ Messages</button>
          <button type="button" className="secondary-btn ona-header-account" onClick={() => navigate("profile")}>
            {profile ? `♡ ${profile.displayName}` : "Sign in"}
          </button>

          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={
              mobileMenuOpen
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="onaheya-mobile-menu"
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            id="onaheya-mobile-menu"
            className="mobile-dropdown"
            aria-label="Mobile navigation"
          >
            {[
              ["⌂", "Home", "home"],
              ["✦", "Features", "features"],
              ["▣", "My Rooms", "rooms"],
              ["♡", "Community", "community"],
              ["✉", "Messages", "messages"],
              ["◉", profile ? `♡ ${profile.displayName}` : "Sign in", "profile"],
              ["✦", "Movie Dates", "dates"],
              ["◈", "Browse Movies", "browse"],
              ["ⓘ", "My Space", "library"],
            ].map(([symbol, label, page]) => (
              <button
                key={label}
                type="button"
                className={
                  activePage === page ? "active" : ""
                }
                onClick={() => navigate(page)}
              >
                <span>{symbol}</span>
                {label}
              </button>
            ))}


          </nav>
        )}
      </header>

      {/* ===================================
          MAIN CONTENT
      =================================== */}

      <main className={`screen-main view-${activePage}`}>
        {selectedBrowseFilm && pageHistory.includes("browse") && ["dates", "community", "library", "bookclub", "messages"].includes(activePage) && (
          <button type="button" className="ona-return-to-film" onClick={() => navigate("browse")}>← Back to {selectedBrowseFilm.title}</button>
        )}
        {pageHistory.length > 0 && !["home", "realtime", "watch-party"].includes(activePage) && (
          <button type="button" className="ona-global-back" onClick={goBack} aria-label="Return to previous page">← Back</button>
        )}

        {/* ===================================
            HOME
        =================================== */}

        {activePage === "home" && (
          <section className="hero screen-panel">
            <div className="hero-text">
              <p className="eyebrow">
                MOVIES BRING US CLOSER
              </p>

              <h1>
                Different places.
                <br />
                <span>Same room.</span>
              </h1>

              <p className="hero-description">
                ONAHEYA is a cozy space to watch together,
                chat in real time, and feel close no matter
                where you are in the world.
              </p>

              <div className="hero-actions">
                {!profile && <button
                  className="primary-btn"
                  type="button"
                  onClick={() => navigate("profile")}
                >
                  Get Started →
                </button>}

                {profile && <button className="primary-btn" type="button" onClick={() => navigate("browse")}>Browse films →</button>}
                <button className="secondary-btn" type="button" onClick={() => navigate("features")}>Explore Features</button>
              </div>

              <div className="hero-community">
                <div className="avatar-row">
                  {["L", "M", "K", "A"].map((letter) => (
                    <div
                      className="avatar"
                      key={letter}
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                <p>
                  Make your next movie night a
                  shared moment.
                </p>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-room">

                {/* Participant images */}
                {participants.map((person) => (
                  <div
                    className={`floating-user ${person.position}`}
                    key={person.city}
                  >
                    <img
                      src={person.image}
                      alt={`${person.city} participant`}
                      className="floating-user-image"
                    />

                    <div className="floating-user-name">
                      {person.city}
                    </div>
                  </div>
                ))}

                {/* Main shared television */}
                <div className="tv-screen">
                  <img
                    src="/images/shared-room.jpg"
                    alt="Shared watch experience"
                    className="tv-shared-image"
                  />

                </div>

                <div className="coffee-table">
                  <div className="cup" />
                  <div className="popcorn" />
                  <div className="cup" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================
            FEATURES
        =================================== */}

        {activePage === "features" && (
          <section className="ona-features-view screen-panel">
            <div className="ona-feature-intro"><p className="eyebrow">MORE THAN A MOVIE NIGHT</p>
              <h2>Stories feel better <em>together.</em></h2>
              <p>From a first watch to the conversation afterwards, every ONAHEYA feature has somewhere to take you.</p>
            </div>
            <div className="ona-feature-gallery">
              {[
                {icon:"▶",title:"Watch Together",note:"A movie night, wherever you are",image:"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1100&q=85",page:"rooms",action:"Enter watch rooms"},
                {icon:"📖",title:"Movies meet novels",note:"Read the story behind the screen",image:"https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85",page:"browse",action:"Explore film & book"},
                {icon:"✉",title:"Real conversations",note:"Friends, private messages and book discussions",image:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1100&q=85",page:"messages",action:"Open conversations"},
                {icon:"♡",title:"Moments worth keeping",note:"TapTap, Memory Tickets & capsules inside a room",image:"https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1000&q=85",page:"rooms",action:"Open a watch room"},
                {icon:"✧",title:"Plan movie dates",note:"Invite your people and share a story",image:"https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1000&q=85",page:"dates",action:"Plan a date"},
                {icon:"＋",title:"Shared watchlists",note:"Curate your next watch together",image:"https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1000&q=85",page:"library",action:"Open My Space"},
              ].map((feature) => (
                <button type="button" key={feature.title} className="ona-feature-photo-card"
                  onClick={() => navigate(feature.page)} aria-label={`${feature.title}: ${feature.action}`}>
                  <img src={feature.image} alt="" loading="lazy" />
                  <span className="ona-feature-scrim"/>
                  <span className="ona-feature-card-copy"><span className="ona-feature-card-icon">{feature.icon}</span>
                    <strong>{feature.title}</strong><small>{feature.note}</small>
                    <span className="ona-feature-open">{feature.action} <span aria-hidden="true">↗</span></span>
                  </span>
                </button>
              ))}
            </div>
            <p className="ona-feature-footnote">TogetherSpace phone pairing is planned for full live-deployment testing. TapTap and Moment Capsules are accessed from an active watch room.</p>
          </section>
        )}

        {/* ===================================
            MY ROOMS
        =================================== */}

        {activePage === "rooms" && (
          <section className="my-rooms-section screen-panel">
            <div className="my-rooms-heading">
              <p className="eyebrow">
                YOUR PERSONAL WATCH SPACES
              </p>

              <h2>My Rooms ♡</h2>

              <p>
                Your favorite people,
                your favorite stories,
                all in one cozy place.
              </p>
            </div>

            <div className="my-rooms-grid">

              {/* Create Room */}
              <button
                className="my-room-tile create-room-tile"
                type="button"
                onClick={() => navigate("create-room")}
              >
                <div className="my-room-icon">
                  ＋
                </div>

                <h3>Create a Room</h3>

                <p>
                  Start a new movie night and
                  invite your people.
                </p>

                <span className="my-room-label">
                  Your room, your rules
                </span>
              </button>

              {/* Join With Code */}
              <button
  className="my-room-tile join-room-tile"
  type="button"
  onClick={() => {
    setJoinCode("");
    setJoinError("");
    setFoundRoom(null);
    navigate("join-room");
  }}
>
                <div className="my-room-icon">
                  ⌂
                </div>

                <h3>Join with a Code</h3>

                <p>
                  Got an invitation?
                  Your friends are waiting.
                </p>

                <span className="my-room-label">
                  Join friends on any device
                </span>
              </button>

              {/* My Watch Parties */}
              <button
                className="my-room-tile saved-room-tile"
                type="button"
                onClick={() => navigate("saved-rooms")}
              >
                <div className="my-room-icon">
                  ♡
                </div>

                <h3>My Watch Parties</h3>

                <p>
                  Your created and joined rooms
                  will appear here.
                </p>

                <span className="my-room-label">
                  {myRooms.length} saved{" "}
                  {myRooms.length === 1
                    ? "room"
                    : "rooms"}
                </span>
              </button>

            </div>
          </section>
        )}

        {/* ===================================
            CREATE ROOM WITH LIVE PREVIEW
        =================================== */}

        {activePage === "create-room" && (
          <section className="room-form-screen screen-panel">

            <div className="room-form-intro">
              <p className="eyebrow">
                A SPACE OF YOUR OWN
              </p>

              <h2>
                Create your cozy room ♡
              </h2>

              <p>
                Make a space for your favorite
                people and stories.
              </p>
            </div>

            <div className="room-builder-layout">

              {/* Room creation form */}
              <form
                className="room-creation-form"
                onSubmit={createRoom}
              >
                <label htmlFor="create-display-name">
                  Your display name
                </label>
                <input
                  id="create-display-name"
                  type="text"
                  maxLength={32}
                  placeholder="e.g. Lerato"
                  value={profile?.displayName || displayName}
                  disabled={Boolean(profile)}
                  autoComplete="nickname"
                  required
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setRoomError("");
                  }}
                />

                <label htmlFor="room-name">
                  Room name
                </label>

                <input
                  id="room-name"
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Girls Movie Night"
                  value={roomName}
                  required
                  onChange={(event) => {
                    setRoomName(event.target.value);
                    setRoomError("");
                  }}
                />

                <label htmlFor="room-mood">
                  Room mood
                </label>

                <select
                  id="room-mood"
                  value={roomMood}
                  onChange={(event) =>
                    setRoomMood(event.target.value)
                  }
                >
                  <option value="Cozy">Cozy</option>
                  <option value="Sunset">Sunset</option>
                  <option value="Rainy">Rainy</option>
                  <option value="Late Night">Late Night</option>
                  <option value="Romance">Romance</option>
                </select>

                <label htmlFor="room-privacy">
                  Privacy
                </label>

                <select
                  id="room-privacy"
                  value={roomPrivacy}
                  onChange={(event) =>
                    setRoomPrivacy(event.target.value)
                  }
                >
                  <option value="Private">
                    Private
                  </option>
                  <option value="Public">
                    Public
                  </option>
                </select>

                {roomError && (
                  <p
                    role="alert"
                    style={{ color: "#b54d37" }}
                  >
                    {roomError}
                  </p>
                )}

                <div className="room-form-actions">
                  <button
                    className="primary-btn"
                    type="submit"
                  >
                    Create Room →
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => navigate("rooms")}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {/* Live room mood preview */}
              <LiveRoomPreview
                roomName={roomName}
                roomMood={roomMood}
                roomPrivacy={roomPrivacy}
                currentMoodTheme={currentMoodTheme}
              />

            </div>
          </section>
        )}


{/* ===================================
    JOIN WITH A CODE
=================================== */}

{activePage === "join-room" && (
  <section className="join-room-screen screen-panel">
    <div className="join-room-intro">
      <p className="eyebrow">
        A LITTLE CLOSER, FROM ANYWHERE
      </p>

      <h2>
        Your people are waiting. ♡
      </h2>

      <p>
        Have an invitation code? Find your
        cozy watch space and join the moment.
      </p>
    </div>

    <div className="join-room-layout">
      <div className="join-room-panel">
        <div className="join-room-symbol">
          ♡
        </div>

        <h3>
          Join a watch party
        </h3>

        <p className="join-room-helper">
          Enter the six-character code shared
          by your room host.
        </p>

        <form
          className="join-room-form"
          onSubmit={findRoomByCode}
        >
          <label htmlFor="join-display-name">
            YOUR DISPLAY NAME
          </label>
          <input
            id="join-display-name"
            type="text"
            maxLength={32}
            placeholder="e.g. Faith"
            value={profile?.displayName || displayName}
            disabled={Boolean(profile)}
            autoComplete="nickname"
            required
            onChange={(event) => {
              setDisplayName(event.target.value);
              setJoinError("");
            }}
          />

          <label htmlFor="join-code">
            YOUR INVITATION CODE
          </label>

          <input
            id="join-code"
            type="text"
            value={joinCode}
            onChange={(event) => {
              const nextCode = event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);

              setJoinCode(nextCode);
              setJoinError("");
              setFoundRoom(null);
            }}
            maxLength={6}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(joinError)}
            aria-describedby={
              joinError ? "join-error" : undefined
            }
            required
          />

          {joinError && (
            <p
              className="join-error"
              id="join-error"
              role="alert"
            >
              {joinError}
            </p>
          )}

          <button
            className="primary-btn join-submit"
            type="submit"
          >
            Find My Room →
          </button>
        </form>

        <button
          className="join-back-link"
          type="button"
          onClick={() => navigate("rooms")}
        >
          ← Back to My Rooms
        </button>
      </div>

      <aside className="join-room-visual">

          
            <div className="join-visual-heading">
              <span>✦ A PLACE FOR US</span>
              <h3>
                Better stories.
                <br />
                Shared together.
              </h3>
            </div>

            <div className="join-friends-scene">
              {participants.map((person) => (
                <div
                  className={`join-friend join-${person.position}`}
                  key={person.city}
                >
                  <img
                    src={person.image}
                    alt={`${person.city} participant`}
                  />
                  <span>{person.city}</span>
                </div>
              ))}

              <div className="join-scene-heart">
                ♡
              </div>
            </div>

            <div className="join-visual-footer">
              <span>♡</span>
              Different places. Same room.
            </div>
          
      </aside>
    </div>
  </section>
)}

{/* ===================================
    JOINED ROOM — LOCAL DEMO
=================================== */}


   
         
{/* ===================================
    ONAHEYA — WATCH PARTY ROOM
=================================== */}

{activePage === "watch-party" && activeRoom && (
  <WatchPartyRoom
    key={activeRoom.id}
    room={activeRoom}
    decorations={
      <MoodDecorations mood={activeRoom.mood} />
    }
    onBack={() => {
      navigate("saved-rooms");
    }}
  />
)}


        {(activePage === "community" || activePage === "dates" || activePage === "discover") && (
          <DiscoverDates profile={profile} section={activePage === "dates" ? "dates" : "community"}
            initialFilmTitle={pendingFilmTitle}
            onGoDates={(title) => { setPendingFilmTitle(title); navigate("dates"); }}
            onGoProfile={() => navigate("profile")}
            onWatchDemo={(film) => {
              const nickname = profile?.displayName || displayName.trim();
              if (!nickname) { navigate("profile"); return; }
              setLiveAction({mode:"create",name:film.title,mood:"Cozy",privacy:"Private",nickname,videoId:film.id});
              navigate("realtime");
            }}
            onStartWatch={(date) => {
              setLiveAction({mode:"create", name:date.title, mood:date.mood,
                privacy:"Private", nickname:profile.displayName, movieDateId:date.id});
              navigate("realtime");
            }}
            onJoinWatch={(date) => {
              setLiveAction({mode:"join", code:date.roomCode, nickname:profile.displayName});
              navigate("realtime");
            }} />
        )}

        {activePage === "library" && (
          <section className="ona-connected-page screen-panel">
            <p className="eyebrow">YOUR STORIES, TOGETHER</p>
            <h2>My Space ♡</h2>
            <p>Bring your watchlists, reading, movie plans and friends together in one place.</p>
            <div className="ona-quick-links">
              <button onClick={() => navigate("profile")}>♡ My profile</button>
              <button onClick={() => navigate("saved-rooms")}>▣ My watch parties</button>
              <button onClick={() => navigate("dates")}>✧ My movie dates</button>
              <button onClick={() => navigate("downloads")}>↓ My downloads</button>
              <button onClick={() => navigate("messages")}>✉ Messages</button>
            </div>
            {profile ? <SharedWatchlists username={profile.username} onWatch={(film) => {
              setLiveAction({ mode: "create", name: film.title, mood: "Cozy", privacy: "Private", nickname: profile.displayName, videoId: film.id });
              navigate("realtime");
            }} /> : <p>Sign in to create and share watchlists. <button onClick={() => navigate("profile")}>Sign in ♡</button></p>}
            <div className="ona-read-link"><h3>Continue your story 📖</h3><p>Read Alice's Adventures in Wonderland or join its book club.</p>
              <button onClick={() => setReadingBook("alice")}>Read Alice ♡</button>
              <button onClick={() => navigate("bookclub")}>Open book club →</button>
            </div>
          </section>
        )}
        {activePage === "downloads" && <OfflineDownloads onBack={() => navigate("library")} />}
        {activePage === "bookclub" && (
          <section className="ona-connected-page screen-panel"><button className="ona-backlink" onClick={goBack}>← Back</button>
            <h2>Alice's Book Club ♡</h2>
            {profile ? <BookDiscussion username={profile.username} /> : <p>Sign in to join the conversation. <button onClick={() => navigate("profile")}>Sign in</button></p>}
            <button onClick={() => setReadingBook("alice")}>Read the novel →</button>
          </section>
        )}
        {readingBook && <BookReader book={getAliceBook()} onClose={() => setReadingBook(null)} onWatch={() => {setReadingBook(null); navigate("browse");}} />}

        {activePage === "messages" && (
          <Messages profile={profile} onGoProfile={() => navigate("profile")} onGoPeople={() => navigate("social")} />
        )}

        {activePage === "social" && (
          <SocialConnections profile={profile} onGoProfile={() => navigate("profile")} />
        )}

        {activePage === "profile" && (profile
          ? <ProfileHome profile={profile} onEdit={() => navigate("edit-profile")} onSettings={() => navigate("settings")} onConnections={() => navigate("social")} onCommunity={() => navigate("community")} />
          : <AccountProfile profile={profile} onProfile={(next) => {setProfile(next); setDisplayName(next?.displayName || "");}} onBack={goBack} onComplete={() => navigate("profile")} />)}

        {activePage === "edit-profile" && <AccountProfile profile={profile}
          onProfile={(next) => {setProfile(next); setDisplayName(next?.displayName || "");}}
          onBack={goBack} onComplete={() => navigate("profile")} />}

        {activePage === "settings" && <section className="ona-settings screen-panel">
          <button type="button" className="ona-settings-back" onClick={goBack}>← Back to profile</button>
          <header><p className="eyebrow">YOUR ACCOUNT</p><h2>Settings & privacy</h2><p>Manage your ONAHEYA experience.</p></header>
          <div className="ona-settings-group"><h3>Account</h3>
            <button onClick={() => navigate("edit-profile")}>Edit profile <span>›</span></button>
            <button onClick={() => navigate("social")}>Followers & following <span>›</span></button>
          </div>
          <div className="ona-settings-group"><h3>Your activity</h3>
            <button onClick={() => navigate("community")}>Community and saved posts <span>›</span></button>
            <button onClick={() => navigate("dates")}>Movie dates <span>›</span></button>
          </div>
          <div className="ona-settings-group"><h3>Session</h3>
            <button className="ona-settings-logout" onClick={() => setLogoutOpen(true)}>Log out <span>→</span></button>
          </div>
        </section>}

        {/* REAL-TIME WATCH PARTY — existing room forms now enter here */}
        {activePage === "realtime" && (
          <RealtimeExperience
            key={`${liveAction?.mode || "lobby"}-${liveAction?.code || liveAction?.name || ""}`}
            initialAction={liveAction}
            onEntered={rememberLiveRoom}
            onBack={() => { setLiveAction(null); if (selectedBrowseFilm && pageHistory.includes("browse")) navigate("browse"); else navigate("rooms"); }}
          />
        )}

        {/* ===================================
            SAVED ROOMS / WATCH PARTIES
        =================================== */}

        {activePage === "saved-rooms" && (
          <section className="saved-rooms-screen screen-panel">
            <p className="eyebrow">
              YOUR SHARED SPACES
            </p>

            <h2>My Watch Parties ♡</h2>

            {myRooms.length === 0 ? (
              <div className="saved-room-card">
                <h3>
                  Your story starts here ♡
                </h3>

                <p>
                  No rooms yet. Create your
                  first cozy watch space!
                </p>

                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => navigate("create-room")}
                >
                  Create a Room →
                </button>
              </div>
            ) : (
              <div className="saved-room-list">
                
{myRooms.map((room) => {
  const savedMoodTheme =
    roomMoodThemes[room.mood] || roomMoodThemes.Cozy;

  return (
    <article
      className={`saved-room-card saved-mood-card ${savedMoodTheme.className}`}
      key={room.id}
    >
      {/* Animated mood atmosphere */}
      <MoodDecorations mood={room.mood} />

      {/* Card content */}
      <div className="saved-mood-content">
        <div className="saved-mood-top">
          <span className="saved-mood-badge">
            ♡ {room.mood}
          </span>

          <span className="saved-privacy-badge">
            {room.privacy === "Private" ? "🔒" : "🌍"}{" "}
            {room.privacy}
          </span>
        </div>

        <div className="saved-mood-bottom">
          <p className="saved-mood-eyebrow">
            YOUR LITTLE WATCH SPACE
          </p>

          <h3>{room.name}</h3>

          <p className="saved-mood-description">
            {savedMoodTheme.label}
          </p>

          <div className="saved-invite-box">
            <div>
              <small>INVITATION CODE</small>
              <strong>{room.code}</strong>
            </div>

            <button
              type="button"
              className="saved-copy-button"
              onClick={() => copyRoomCode(room.code)}
            >
              Copy ↗
            </button>
          </div>
          <button
  type="button"
  className="saved-copy-button"
  onClick={() => {
    if (room.live) {
      setJoinCode(room.code);
      setJoinError("");
      navigate("join-room");
    }
    else { setActiveRoom(room); navigate("watch-party"); }
  }}
>
  ▶ Enter Watch Party
</button>
        </div>
      </div>
    </article>
  );
})}

              </div>
            )}

            {copyMessage && (
              <p role="status">
                {copyMessage}
              </p>
            )}

            <div className="room-form-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => navigate("create-room")}
              >
                + Create Another Room
              </button>

              <button
                className="secondary-btn"
                type="button"
                onClick={() => navigate("rooms")}
              >
                Back to My Rooms
              </button>
            </div>
          </section>
        )}

        {/* ===================================
            BROWSE
        =================================== */}

        {activePage === "browse" && (
          <BrowseStories
            onWatch={(film) => {
              const nickname = profile?.displayName || displayName.trim();
              if (!nickname) { navigate("profile"); return; }
              setLiveAction({ mode: "create", name: film.title, mood: "Cozy", privacy: "Private", nickname, videoId: film.id });
              navigate("realtime");
            }}
            onGoDates={(film) => { setPendingFilmTitle(film.title); navigate("dates"); }}
            onGoCommunity={() => navigate("community")}
            onGoLibrary={() => navigate("library")}
            selectedFilm={selectedBrowseFilm}
            onSelectFilm={setSelectedBrowseFilm}
          />
        )}

        {/* ===================================
            ABOUT
        =================================== */}

        {activePage === "about" && (
          <section className="about-section screen-panel">

            <div className="about-content">
              <p className="eyebrow">
                A LITTLE CLOSER, FROM ANYWHERE
              </p>

              <h2>
                Together feels
                <br />
                <span>like home.</span>
              </h2>

              <p>
                ONAHEYA is built around a simple
                feeling: distance shouldn't mean
                missing out on the moments that
                bring us together.
              </p>

              <p>
                Create your own watch space,
                share reactions, chat with friends,
                and make memories across different
                screens and different places.
              </p>

              <button
                className="primary-btn"
                type="button"
                onClick={() => navigate("home")}
              >
                Back to Home →
              </button>
            </div>

            {/* Cinematic About card */}
            <div className="about-visual about-cinematic">
              <div className="about-image-background" />

              <div className="about-scene-heading">
                <span>
                  ♡ Same stories, brighter together
                </span>

                <h3>
                  Different places.
                  <br />
                  <em>Same room.</em>
                </h3>
              </div>

              <div className="about-participants">
                {participants.map((person) => (
                  <div
                    className={`about-person about-${person.position}`}
                    key={person.city}
                  >
                    <img
                      src={person.image}
                      alt={`Friend in ${person.city}`}
                    />

                    <span>
                      <i />
                      {person.city}
                    </span>
                  </div>
                ))}
              </div>

              <div className="about-connected">
                <span className="connected-pulse" />

                <div>
                  <strong>
                    4 friends connected
                  </strong>

                  <small>
                    One shared moment ♡
                  </small>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      <OnaheyaConfirm open={logoutOpen} title="Log out of ONAHEYA?" message="You'll leave your account on this device. Your posts, messages, film memories, and downloaded videos will remain available according to their existing storage settings." confirmLabel="Log out" danger busy={loggingOut} onCancel={() => setLogoutOpen(false)} onConfirm={async () => {
        setLoggingOut(true);
        try { await fetch(`${import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"}/api/auth/logout`, {method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("onaheya-session")}`},body:"{}"}); }
        catch (e) { console.warn("Logout request unavailable", e); }
        localStorage.removeItem("onaheya-session");
        setProfile(null); setDisplayName(""); setLogoutOpen(false); setLoggingOut(false); navigate("home");
      }}/>

      {/* ===================================
          FOOTER
      =================================== */}

      <footer className="footer">
        <div>
          <h3>ONAHEYA</h3>
          <p>
            Different places. Same room.
          </p>
        </div>

        <div className="footer-links">
          {navigation.map(([label, page]) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(page)}
            >
              {label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;

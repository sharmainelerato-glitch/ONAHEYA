import { useEffect, useRef, useState } from "react";
import "./AccountProfile.css";
const BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
const genres = ["Romance", "Sci-Fi", "Comedy", "Anime", "Thriller", "Drama", "Horror", "Documentary", "Fantasy", "Action"];
export default function AccountProfile({ profile, onProfile, onBack, onComplete }) {
  const [mode, setMode] = useState("register");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState(profile?.bio || "");
  const [favorites, setFavorites] = useState(profile?.favoriteGenres || []);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { setDisplayName(profile?.displayName || ""); setBio(profile?.bio || ""); setFavorites(profile?.favoriteGenres || []); }, [profile]);
  async function request(endpoint, body, auth = false) {
    const response = await fetch(`${BASE}${endpoint}`, { method: endpoint === "/api/me" ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${localStorage.getItem("onaheya-session")}` } : {}) }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || "Please try again.");
    return data;
  }
  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = mode === "register" ? { username, displayName, password } : { username, password };
      const data = await request(`/api/auth/${mode === "register" ? "register" : "login"}`, payload);
      localStorage.setItem("onaheya-session", data.token);
      onProfile(data.profile); setPassword(""); setNotice("You're signed in ♡");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const data = await request("/api/me", { displayName, bio, favoriteGenres: favorites }, true); onProfile(data.profile); setNotice("Profile saved ♡"); onComplete?.(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function updatePhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file."); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a photo under 10 MB."); return;
    }
    setUploadingPhoto(true); setError(""); setNotice("");
    let objectURL;
    try {
      objectURL = URL.createObjectURL(file);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve; image.onerror = () => reject(Error("Could not open this image."));
        image.src = objectURL;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 320; canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("Could not process the image.");
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.drawImage(image,
        (image.naturalWidth-side)/2, (image.naturalHeight-side)/2, side, side,
        0, 0, 320, 320);
      const avatarUrl = canvas.toDataURL("image/jpeg", 0.78);
      const response = await fetch(`${BASE}/api/me/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("onaheya-session")}` },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || "Could not save photo.");
      onProfile(data.profile);
      setNotice("Profile picture updated ♡");
    } catch (e) { setError(e.message || "Photo upload failed."); }
    finally {
      if (objectURL) URL.revokeObjectURL(objectURL);
      if (fileRef.current) fileRef.current.value = "";
      setUploadingPhoto(false);
    }
  }
  async function removePhoto() {
    setUploadingPhoto(true); setError("");
    try {
      const response = await fetch(`${BASE}/api/me/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("onaheya-session")}` },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || "Could not remove photo.");
      onProfile(data.profile); setNotice("Photo removed.");
    } catch(e) { setError(e.message); }
    finally { setUploadingPhoto(false); }
  }
  async function logout() {
    setBusy(true); try { await request("/api/auth/logout", {}, true); } catch {};
    localStorage.removeItem("onaheya-session"); onProfile(null); setBusy(false); setNotice("Signed out.");
  }
  return <section className="ona-account screen-panel">
    <div className="ona-account-intro"><span className="eyebrow">A LITTLE SPACE OF YOUR OWN</span><h2>{profile ? "Your ONAHEYA profile ♡" : "Find your people ♡"}</h2><p>{profile ? "Make your corner of movie night feel like home." : "Create an account so your profile and name stay yours between movie nights."}</p></div>
    <div className="ona-account-card">
      {!profile ? <>
        <div className="ona-account-tabs"><button type="button" className={mode === "register" ? "chosen" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button><button type="button" className={mode === "login" ? "chosen" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button></div>
        <form onSubmit={submitAuth} className="ona-account-form">
          <label>Unique username <input required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="lira_movies" /></label>
          {mode === "register" && <label>Display name <input required minLength={2} maxLength={32} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Lira" /></label>}
          <label>Password <input type="password" required minLength={mode === "register" ? 10 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="primary-btn" disabled={busy}>{busy ? "One moment…" : mode === "register" ? "Create my account ♡" : "Sign in ♡"}</button>
        </form>
      </> : <>
        <div className="ona-profile-top">
          <div className="ona-avatar">{profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={`${profile.displayName}'s profile`} className="ona-avatar-image" />
            : profile.displayName?.charAt(0).toUpperCase()}</div>
          <div><h3>{profile.displayName}</h3><p>@{profile.username}</p>
            <div className="ona-photo-actions">
              <input type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp" aria-label="Choose profile picture" className="ona-photo-input" onChange={e => updatePhoto(e.target.files?.[0])} />
              <button type="button" disabled={uploadingPhoto || busy} onClick={() => fileRef.current?.click()}>{uploadingPhoto ? "Uploading…" : "Upload photo"}</button>
              {profile.avatarUrl && <button type="button" disabled={uploadingPhoto || busy} onClick={removePhoto}>Remove</button>}
            </div>
          </div>
        </div>
        <div className="ona-profile-stats"><div><strong>{profile.followersCount || 0}</strong><span>Followers</span></div><div><strong>{profile.followingCount || 0}</strong><span>Following</span></div></div>
        <p className="ona-profile-note">Your followers and following are linked to real accounts. Open ♡ People to find friends, follow them, and view notifications.</p>
        <form onSubmit={save} className="ona-account-form">
          <label>Display name <input required minLength={2} maxLength={32} value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>
          <label>Your bio <textarea maxLength={160} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="A little about you and the stories you love…" /></label>
          <span className="ona-label">Favourite genres (up to 8)</span>
          <div className="ona-genre-list">{genres.map(g => <button key={g} type="button" className={favorites.includes(g) ? "active" : ""} onClick={() => setFavorites(prev => prev.includes(g) ? prev.filter(x => x !== g) : prev.length < 8 ? [...prev, g] : prev)}>{g}</button>)}</div>
          <button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save profile ♡"}</button>
        </form>
        <button className="ona-signout" disabled={busy} onClick={logout}>Sign out</button>
      </>}
      {error && <p className="ona-form-error" role="alert">{error}</p>}
      {notice && <p className="ona-form-ok" role="status">{notice}</p>}
      <button className="ona-back" onClick={onBack}>← Back to My Rooms</button>
    </div>
  </section>;
}

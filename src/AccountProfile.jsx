
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import PasswordRecovery from "./PasswordRecovery";
import "./AccountProfile.css";

const BASE =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:3001";

const genres = [
  "Romance",
  "Sci-Fi",
  "Comedy",
  "Anime",
  "Thriller",
  "Drama",
  "Horror",
  "Documentary",
  "Fantasy",
  "Action",
];

export default function AccountProfile({
  profile,
  onProfile,
  onBack,
  onComplete,
}) {
  const [mode, setMode] = useState("register");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Existing accounts can still use their old login.
  const [legacyLogin, setLegacyLogin] = useState(false);

  const [bio, setBio] = useState(profile?.bio || "");
  const [favorites, setFavorites] = useState(
    profile?.favoriteGenres || []
  );

  const [busy, setBusy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    setBio(profile?.bio || "");
    setFavorites(profile?.favoriteGenres || []);
  }, [profile]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setLegacyLogin(false);
    setError("");
    setNotice("");
    setPassword("");
  }

  async function request(endpoint, body, auth = false) {
    const response = await fetch(`${BASE}${endpoint}`, {
      method: endpoint === "/api/me" ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth
          ? {
              Authorization: `Bearer ${localStorage.getItem(
                "onaheya-session"
              )}`,
            }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Please try again.");
    }

    return data;
  }

  // Exchange a verified Supabase access token
  // for ONAHEYA's existing backend session.

  async function finishSupabaseLogin(
    accessToken,
    selectedUsername
  ) {
    const response = await fetch(
      `${BASE}/api/auth/supabase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          ...(selectedUsername
            ? { username: selectedUsername }
            : {}),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "Could not complete sign in."
      );
    }

    if (!data.token || !data.profile) {
      throw new Error(
        "The server returned an incomplete session."
      );
    }

    localStorage.setItem("onaheya-session", data.token);
    onProfile(data.profile);

    return data.profile;
  }

  // REGISTER / LOGIN

  async function submitAuth(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      if (mode === "register") {
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          throw new Error(
            "Username must contain 3–20 letters, numbers or underscores."
          );
        }

        if (password.length < 10) {
          throw new Error(
            "Please choose a password with at least 10 characters."
          );
        }

        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                username: cleanUsername,
                displayName: cleanUsername,
              },
            },
          });

        if (signupError) throw signupError;

        if (!data.user) {
          throw new Error(
            "Your account could not be created."
          );
        }

        setPassword("");

        // With email confirmation enabled, Supabase
        // usually returns a user but no active session.

        if (!data.session) {
          setMode("login");
          setLegacyLogin(false);

          setNotice(
            "Check your inbox for a verification email. " +
              "After confirming your email, return to ONAHEYA " +
              "and sign in. ♡"
          );

          return;
        }

        await finishSupabaseLogin(
          data.session.access_token,
          cleanUsername
        );

        setNotice("Welcome to ONAHEYA! ♡");
      } else if (legacyLogin) {
        // Existing ONAHEYA username-based accounts.

        const data = await request("/api/auth/login", {
          username: cleanUsername,
          password,
        });

        localStorage.setItem(
          "onaheya-session",
          data.token
        );

        onProfile(data.profile);
        setPassword("");
        setNotice("Welcome back! ♡");
      } else {
        // New Supabase email-based accounts.

        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) throw loginError;

        if (!data.session?.access_token) {
          throw new Error(
            "Could not create a session. Please try again."
          );
        }

        await finishSupabaseLogin(
          data.session.access_token
        );

        setPassword("");
        setNotice("Welcome back! ♡");
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // PROFILE SETTINGS

  async function save(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await request(
        "/api/me",
        {
          // Backend compatibility:
          // username is also used as displayName.
          displayName: profile?.username || "",
          bio,
          favoriteGenres: favorites,
        },
        true
      );

      onProfile(data.profile);
      setNotice("Profile saved ♡");
      onComplete?.();
    } catch (err) {
      setError(
        err.message || "Could not save your profile."
      );
    } finally {
      setBusy(false);
    }
  }

  // PROFILE PHOTO UPLOAD

  async function updatePhoto(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a photo under 10 MB.");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setNotice("");

    let objectURL;

    try {
      objectURL = URL.createObjectURL(file);

      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () =>
          reject(new Error("Could not open this image."));
        image.src = objectURL;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not process the image.");
      }

      const side = Math.min(
        image.naturalWidth,
        image.naturalHeight
      );

      ctx.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        320,
        320
      );

      const avatarUrl = canvas.toDataURL(
        "image/jpeg",
        0.78
      );

      const response = await fetch(
        `${BASE}/api/me/avatar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "onaheya-session"
            )}`,
          },
          body: JSON.stringify({
            avatarUrl,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Could not save your photo."
        );
      }

      onProfile(data.profile);
      setNotice("Profile picture updated ♡");
    } catch (err) {
      setError(
        err.message || "Photo upload failed."
      );
    } finally {
      if (objectURL) {
        URL.revokeObjectURL(objectURL);
      }

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setUploadingPhoto(false);
    }
  }

  // REMOVE PROFILE PHOTO

  async function removePhoto() {
    setUploadingPhoto(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${BASE}/api/me/avatar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "onaheya-session"
            )}`,
          },
          body: JSON.stringify({
            avatarUrl: null,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Could not remove your photo."
        );
      }

      onProfile(data.profile);
      setNotice("Profile photo removed.");
    } catch (err) {
      setError(
        err.message || "Could not remove your photo."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  // LOG OUT

  async function logout() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await request("/api/auth/logout", {}, true);
    } catch {
      // Still clear local authentication if backend fails.
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out failed:", err);
    }

    localStorage.removeItem("onaheya-session");

    onProfile(null);

    setUsername("");
    setEmail("");
    setPassword("");
    setMode("login");
    setLegacyLogin(false);

    setBusy(false);
    setNotice("Signed out. See you again! ♡");
  }

  // PASSWORD RECOVERY

  if (showRecovery && !profile) {
    return (
      <PasswordRecovery
        onBack={() => {
          setShowRecovery(false);
          setMode("login");
          setLegacyLogin(false);
          setError("");
          setNotice("");
        }}
      />
    );
  }

  return (
    <section className="ona-account screen-panel">
      {/* PAGE INTRODUCTION */}

      <div className="ona-account-intro">
        <span className="eyebrow">
          A LITTLE SPACE OF YOUR OWN
        </span>

        <h2>
          {profile
            ? "Your ONAHEYA profile ♡"
            : "Find your people ♡"}
        </h2>

        <p>
          {profile
            ? "Make your corner of movie night feel like home."
            : "A place where stories bring people together."}
        </p>
      </div>

      <div className="ona-account-card">
        {!profile ? (
          <>
            {/* REGISTRATION / LOGIN TABS */}

            <div className="ona-account-tabs">
              <button
                type="button"
                className={
                  mode === "register" ? "chosen" : ""
                }
                onClick={() => switchMode("register")}
              >
                Create account
              </button>

              <button
                type="button"
                className={
                  mode === "login" ? "chosen" : ""
                }
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
            </div>

            {/* ACCOUNT FORM */}

            <form
              className="ona-account-form"
              onSubmit={submitAuth}
            >
              {/* EMAIL FOR SUPABASE REGISTRATION/LOGIN */}

              {!legacyLogin && (
                <label>
                  Email address
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                  />
                </label>
              )}

              {/* USERNAME FOR REGISTRATION OR LEGACY LOGIN */}

              {(mode === "register" || legacyLogin) && (
                <label>
                  Unique username
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    autoComplete="username"
                    placeholder="lira_movies"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                  />
                </label>
              )}

              {/* PASSWORD */}

              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={
                    mode === "register" ? 10 : 1
                  }
                  maxLength={128}
                  autoComplete={
                    mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder={
                    mode === "register"
                      ? "Create a password (10+ characters)"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={busy}
              >
                {busy
                  ? "One moment…"
                  : mode === "register"
                  ? "Create my account ♡"
                  : "Sign in ♡"}
              </button>
            </form>

            {/* FORGOT PASSWORD */}

            {mode === "login" && !legacyLogin && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="ona-back"
                  onClick={() => {
                    setShowRecovery(true);
                    setError("");
                    setNotice("");
                    setPassword("");
                  }}
                >
                  Forgot password? ♡
                </button>
              </div>
            )}

            {/* EXISTING ACCOUNTS */}

            {mode === "login" && (
              <div
                style={{
                  marginTop: 18,
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  className="ona-back"
                  onClick={() => {
                    setLegacyLogin((current) => !current);
                    setError("");
                    setNotice("");
                    setPassword("");
                  }}
                >
                  {legacyLogin
                    ? "← Sign in with email"
                    : "Have an older ONAHEYA account? Sign in with username"}
                </button>

                {legacyLogin && (
                  <p
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 8,
                    }}
                  >
                    This option is for accounts created
                    before email registration was introduced.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* PROFILE HEADER */}

            <div className="ona-profile-top">
              <div className="ona-avatar">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.username}'s profile`}
                    className="ona-avatar-image"
                  />
                ) : (
                  profile.username
                    ?.charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div>
                <h3>{profile.username}</h3>
                <p>@{profile.username}</p>

                {/* PROFILE PHOTO ACTIONS */}

                <div className="ona-photo-actions">
                  <input
                    type="file"
                    ref={fileRef}
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Choose profile picture"
                    className="ona-photo-input"
                    onChange={(e) =>
                      updatePhoto(e.target.files?.[0])
                    }
                  />

                  <button
                    type="button"
                    disabled={uploadingPhoto || busy}
                    onClick={() =>
                      fileRef.current?.click()
                    }
                  >
                    {uploadingPhoto
                      ? "Uploading…"
                      : "Upload photo"}
                  </button>

                  {profile.avatarUrl && (
                    <button
                      type="button"
                      disabled={uploadingPhoto || busy}
                      onClick={removePhoto}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* FOLLOWERS AND FOLLOWING */}

            <div className="ona-profile-stats">
              <div>
                <strong>
                  {profile.followersCount || 0}
                </strong>
                <span>Followers</span>
              </div>

              <div>
                <strong>
                  {profile.followingCount || 0}
                </strong>
                <span>Following</span>
              </div>
            </div>

            <p className="ona-profile-note">
              Your followers and following are linked
              to real accounts. Open ♡ People to find
              friends, follow them, and view notifications.
            </p>

            {/* EDIT PROFILE */}

            <form
              className="ona-account-form"
              onSubmit={save}
            >
              <label>
                Username
                <input
                  value={profile.username || ""}
                  readOnly
                  aria-readonly="true"
                />
              </label>

              <label>
                Your bio
                <textarea
                  maxLength={160}
                  rows={3}
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                  placeholder="A little about you and the stories you love…"
                />
              </label>

              <span className="ona-label">
                Favourite genres (up to 8)
              </span>

              <div className="ona-genre-list">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className={
                      favorites.includes(genre)
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setFavorites((prev) =>
                        prev.includes(genre)
                          ? prev.filter(
                              (g) => g !== genre
                            )
                          : prev.length < 8
                          ? [...prev, genre]
                          : prev
                      )
                    }
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : "Save profile ♡"}
              </button>
            </form>

            {/* SIGN OUT */}

            <button
              type="button"
              className="ona-signout"
              disabled={busy}
              onClick={logout}
            >
              Sign out
            </button>
          </>
        )}

        {/* FEEDBACK */}

        {error && (
          <p
            className="ona-form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            className="ona-form-ok"
            role="status"
          >
            {notice}
          </p>
        )}

        {/* NAVIGATION */}

        <button
          type="button"
          className="ona-back"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>
    </section>
  );
}

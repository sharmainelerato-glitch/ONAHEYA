
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setReady(Boolean(data.session));
    };

    check();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event) {
    event.preventDefault();

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Your password has been updated. ♡");
      setPassword("");
      setConfirm("");
      await supabase.auth.signOut();
    }

    setBusy(false);
  }

  return (
    <main className="ona-account screen-panel">
      <div className="ona-account-card">
        <h2>Create a new password ♡</h2>

        {!ready ? (
          <p>
            Checking your recovery link…
            If it has expired, request a new one.
          </p>
        ) : (
          <form
            className="ona-account-form"
            onSubmit={updatePassword}
          >
            <label>
              New password
              <input
                type="password"
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                minLength={10}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>

            <button className="primary-btn" disabled={busy}>
              {busy ? "Updating…" : "Update password ♡"}
            </button>
          </form>
        )}

        {message && <p role="status">{message}</p>}
        <a href="/">Return to ONAHEYA</a>
      </div>
    </main>
  );
}

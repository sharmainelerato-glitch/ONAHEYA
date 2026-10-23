
import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function PasswordRecovery({ onBack }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendReset(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo:
            `${window.location.origin}/reset-password`,
        });

      if (resetError) throw resetError;

      setMessage(
        "If this email is registered, " +
        "you'll receive a password reset link shortly. ♡"
      );
    } catch (err) {
      setError(err.message || "Couldn't send recovery email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ona-account screen-panel">
      <div className="ona-account-card">
        <h2>Forgot your password? ♡</h2>
        <p>
          Enter your email address and we'll send you
          a secure link to reset your password.
        </p>

        <form
          className="ona-account-form"
          onSubmit={sendReset}
        >
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <button className="primary-btn" disabled={busy}>
            {busy ? "Sending…" : "Send reset link ♡"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}

        <button type="button" onClick={onBack}>
          ← Back to Sign In
        </button>
      </div>
    </section>
  );
}

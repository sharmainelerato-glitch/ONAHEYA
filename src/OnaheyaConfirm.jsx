import { useEffect, useRef } from "react";
import "./OnaheyaConfirm.css";

/** Small in-app confirmation dialog. No browser-native confirm/alert popups. */
export default function OnaheyaConfirm({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, busy = false, onConfirm, onCancel }) {
  const cancelButton = useRef(null);
  useEffect(() => {
    if (!open) return;
    const oldActive = document.activeElement;
    cancelButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) { event.preventDefault(); onCancel?.(); }
      if (event.key === "Tab") {
        const buttons = Array.from(document.querySelectorAll(".ona-confirm-dialog button:not([disabled])"));
        if (!buttons.length) return;
        const i = buttons.indexOf(document.activeElement);
        if (event.shiftKey && i <= 0) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!event.shiftKey && i === buttons.length - 1) { event.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); oldActive?.focus?.(); };
  }, [open, busy, onCancel]);
  if (!open) return null;
  return <div className="ona-confirm-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}>
    <div className="ona-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ona-confirm-title" aria-describedby="ona-confirm-desc">
      <div className="ona-confirm-mark">♡</div>
      <h2 id="ona-confirm-title">{title}</h2>
      <p id="ona-confirm-desc">{message}</p>
      <div className="ona-confirm-actions">
        <button type="button" ref={cancelButton} disabled={busy} className="ona-confirm-cancel" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" disabled={busy} className={danger ? "ona-confirm-accept danger" : "ona-confirm-accept"} onClick={onConfirm}>{busy ? "Please wait…" : confirmLabel}</button>
      </div>
    </div>
  </div>;
}

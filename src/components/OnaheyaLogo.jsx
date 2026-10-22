import React from "react";

export function OnaheyaIcon({
  size = 44,
  className = "",
  background = "transparent",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Onaheya icon"
      role="img"
    >
      {background !== "transparent" && (
        <rect x="0" y="0" width="64" height="64" rx="18" fill={background} />
      )}

      {/* House outline */}
      <path
        d="M15 29.5L32 15L46 26.8V22.8C46 20.7 47.7 19 49.8 19C51.9 19 53.6 20.7 53.6 22.8V33.2L54 33.5"
        stroke="#264D3B"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M21 28.8V47C21 49.2 22.8 51 25 51H39C41.2 51 43 49.2 43 47V28.8"
        stroke="#264D3B"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Heart inside the house */}
      <path
        d="M32 39.2C32 39.2 25.6 35.5 25.6 29.9C25.6 26.9 27.7 24.8 30.3 24.8C31.9 24.8 33.2 25.5 34 26.9C34.8 25.5 36.1 24.8 37.7 24.8C40.3 24.8 42.4 26.9 42.4 29.9C42.4 35.5 36 39.2 36 39.2L34 40.4L32 39.2Z"
        fill="#C96B4B"
      />
    </svg>
  );
}

export default function OnaheyaLogo({
  iconSize = 44,
  showTagline = false,
  className = "",
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <OnaheyaIcon size={iconSize} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "1.55rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#264D3B",
          }}
        >
          ONAHEYA
        </span>

        {showTagline && (
          <span
            style={{
              marginTop: "6px",
              fontSize: "0.72rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#5F675F",
            }}
          >
            Different places. Same room.
          </span>
        )}
      </div>
    </div>
  );
}
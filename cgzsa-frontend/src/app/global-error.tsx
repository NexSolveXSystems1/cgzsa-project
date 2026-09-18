"use client";

/**
 * The last resort: an error in the root layout itself, where the site's own
 * chrome and stylesheet may not have loaded. This file must render its own
 * <html> and <body>, and cannot rely on the global stylesheet, so the few styles
 * it needs are inline.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#F6F8F6",
          color: "#151916",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: "36rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6E7872",
              margin: "0 0 0.75rem",
            }}
          >
            Clean and Green Zero Sphere Alliance
          </p>
          <h1 style={{ fontSize: "1.7rem", margin: "0 0 1rem", lineHeight: 1.2 }}>
            The site is temporarily unavailable
          </h1>
          <p style={{ color: "#464F49", margin: "0 0 1.75rem" }}>
            We are sorry — this is a fault at our end. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 600,
              padding: "0.7rem 1.4rem",
              border: 0,
              borderRadius: "0.4rem",
              background: "#1F5C3D",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ fontSize: "0.8rem", color: "#6E7872", marginTop: "2rem" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}

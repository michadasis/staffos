/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e1a",
        surface: "#111827",
        "surface-alt": "#1a2235",
        border: "#1e2d45",
        accent: "#3b82f6",
        "accent-glow": "#1d4ed8",
        "accent-soft": "#1e3a5f",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        "text-main": "#e2e8f0",
        "text-muted": "#64748b",
        "text-soft": "#94a3b8",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
    },
  },
  plugins: [],
}

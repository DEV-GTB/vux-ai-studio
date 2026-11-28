import React, { useState } from "react"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://yzesegutwydukjcraeud.supabase.co"
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_U9kpf0EiL-eFxY3zZeYmnA_c7fhVdwV"

export default function AuthPage() {
  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const endpoint = mode === "signin"
        ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
        : `${SUPABASE_URL}/auth/v1/signup`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error_description || data.msg || "Auth failed")
      if (data.access_token) {
        localStorage.setItem("vux_supabase_token", data.access_token)
        window.location.href = "/"
      } else {
        setError("Check your email to confirm your account.")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider) => {
    const redirectUrl = encodeURIComponent("https://vux-ai-studio.vercel.app/auth/callback")
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectUrl}`
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/vux-logo.png" alt="VUX AI" style={{ width: "64px", height: "64px", objectFit: "contain", margin: "0 auto 16px", display: "block" }} />
          <h1>VUX AI Studio</h1>
          <p>Sign in to continue</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "signin" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-form">
          <form onSubmit={handleEmailAuth}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />
            {error && <p style={{ color: "red", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "12px", background: "#667eea", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>
        </div>

        <div className="auth-social">
          <div className="social-provider google" onClick={() => handleOAuth("google")}>
            <span>G</span>
            <span>Google</span>
          </div>
          <div className="social-provider github" onClick={() => handleOAuth("github")}>
            <span>GH</span>
            <span>GitHub</span>
          </div>
        </div>
      </div>
    </div>
  )
}

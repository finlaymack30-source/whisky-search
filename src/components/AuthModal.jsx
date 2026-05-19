import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg: '#FAFAF7',
  white: '#FFFFFF',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  ink: '#4A4540',
  border: '#E8E4DC',
  borderMid: '#D8D2C8',
  terracotta: '#7A3328',
  terracottaBg: '#F5EEEC',
  terracottaBorder: '#CCA89E',
}

function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: C.stone, fontFamily: SANS, fontWeight: 400,
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function AuthModal({ mode, onClose, onSuccess, onSwitchMode, pendingValuation }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [emailSent, setEmailSent]         = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError]     = useState(false)

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    console.log('[auth] VITE_SUPABASE_URL:', url ?? 'UNDEFINED')
    console.log('[auth] VITE_SUPABASE_ANON_KEY:', key ? `${key.slice(0, 20)}…` : 'UNDEFINED')
  }, [])

  // When waiting for email confirmation, listen for cross-tab SIGNED_IN.
  // Supabase syncs session via BroadcastChannel/localStorage when the user
  // confirms in another tab — this fires onSuccess() without any manual click.
  useEffect(() => {
    if (!emailSent) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        onSuccess()
      }
    })
    return () => subscription.unsubscribe()
  }, [emailSent])

  const fieldInput = {
    display: 'block', width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', marginTop: 8,
    border: `1px solid ${C.borderMid}`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, fontWeight: 300,
    color: C.dark, background: C.white, outline: 'none',
    letterSpacing: '0.01em',
  }

  const fieldLabel = {
    fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
    color: C.stone, fontFamily: SANS, fontWeight: 400,
  }

  async function handleConfirmCheck() {
    setConfirmLoading(true)
    setConfirmError(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        onSuccess()
      } else {
        setConfirmError(true)
      }
    } catch {
      setConfirmError(true)
    } finally {
      setConfirmLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    )

    try {
      if (mode === 'create') {
        console.log('[auth] calling signUp...')
        const { data, error: authErr } = await Promise.race([
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/cask-valuation`,
            },
          }),
          timeout,
        ])
        console.log('[auth] signUp resolved — error:', authErr?.message ?? null)
        if (authErr) { setError(authErr.message); return }
        if (!data.session) {
          setEmailSent(true)
          return
        }
        onSuccess()
      } else {
        console.log('[auth] calling signInWithPassword...')
        const { data, error: authErr } = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeout,
        ])
        console.log('[auth] signInWithPassword resolved — error:', authErr?.message ?? null)
        if (authErr) { setError(authErr.message); return }
        onSuccess()
      }
    } catch (err) {
      console.error('[auth] caught error:', err?.message)
      setError('Sign in failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(26,26,24,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  }

  const card = {
    background: C.white, border: `1px solid ${C.border}`,
    padding: '52px 48px', width: '100%', maxWidth: 420, borderRadius: 0,
  }

  if (emailSent) {
    return (
      <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={card}>
          <Label style={{ marginBottom: 14 }}>Confirm your email</Label>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: C.dark, marginBottom: 16 }}>
            Check your inbox
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            We've sent a confirmation link to{' '}
            <span style={{ color: C.ink, fontFamily: MONO, fontSize: 12 }}>{email}</span>.
            Click the link to activate your account, then come back and sign in.
          </div>
          <button
            onClick={handleConfirmCheck}
            disabled={confirmLoading}
            style={{
              display: 'block', width: '100%', padding: '14px',
              background: confirmLoading ? C.muted : C.dark, color: '#F5F2EC',
              border: 'none', borderRadius: 0, fontSize: 10,
              fontFamily: SANS, fontWeight: 400,
              cursor: confirmLoading ? 'default' : 'pointer',
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12,
            }}
          >
            {confirmLoading ? 'Checking…' : "I've confirmed my email — sign me in"}
          </button>
          {confirmError && (
            <div style={{
              padding: '10px 14px', marginBottom: 8,
              background: C.terracottaBg, border: `1px solid ${C.terracottaBorder}`,
              fontSize: 12, color: C.terracotta, fontFamily: SANS, fontWeight: 300,
            }}>
              Please confirm your email first.
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>
            Didn't receive it?{' '}
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink, fontSize: 12, fontFamily: SANS, padding: 0, borderBottom: `1px solid ${C.borderMid}`, paddingBottom: 1 }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        <div style={{ marginBottom: 36 }}>
          <Label style={{ marginBottom: 14 }}>
            {mode === 'create' ? 'New account' : 'Sign in'}
          </Label>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: C.dark, marginBottom: 10 }}>
            {mode === 'create' ? 'Create your account' : 'Welcome back'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.6 }}>
            {mode === 'create'
              ? 'Free to use. No card required.'
              : 'Access your account and saved valuations.'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={fieldInput} autoFocus />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={fieldLabel}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 8 characters" style={fieldInput} />
          </div>

          {error && (
            <div style={{
              padding: '11px 14px', marginBottom: 20,
              background: C.terracottaBg, border: `1px solid ${C.terracottaBorder}`,
              fontSize: 12, color: C.terracotta, fontFamily: SANS, fontWeight: 300,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            display: 'block', width: '100%', padding: '14px',
            background: loading ? C.muted : C.dark, color: '#F5F2EC',
            border: 'none', borderRadius: 0,
            fontSize: 10, fontFamily: SANS, fontWeight: 400,
            cursor: loading ? 'default' : 'pointer', letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            {loading ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>
            {mode === 'create' ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => onSwitchMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink, fontSize: 12, fontFamily: SANS, padding: 0, borderBottom: `1px solid ${C.borderMid}`, paddingBottom: 1 }}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                No account?{' '}
                <button type="button" onClick={() => onSwitchMode('create')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.ink, fontSize: 12, fontFamily: SANS, padding: 0, borderBottom: `1px solid ${C.borderMid}`, paddingBottom: 1 }}>
                  Create one free
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

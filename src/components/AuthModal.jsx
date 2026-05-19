import { useState } from 'react'
import { supabase, fetchSubscription } from '../supabase'

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

export default function AuthModal({ mode, onClose, onSuccess, onSwitchMode }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      if (mode === 'create') {
        const { data, error: authErr } = await supabase.auth.signUp({ email, password })
        if (authErr) { setError(authErr.message); return }
        if (!data.session) {
          setEmailSent(true)
          return
        }
        await supabase.from('user_subscriptions')
          .upsert({ user_id: data.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
        onSuccess(await fetchSubscription(data.user.id))
      } else {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
        if (authErr) { setError(authErr.message); return }
        await supabase.from('user_subscriptions')
          .upsert({ user_id: data.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
        onSuccess(await fetchSubscription(data.user.id))
      }
    } catch {
      setError('Something went wrong. Please try again.')
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
            onClick={() => onSwitchMode('signin')}
            style={{
              display: 'block', width: '100%', padding: '14px',
              background: C.dark, color: '#F5F2EC',
              border: 'none', borderRadius: 0, fontSize: 10,
              fontFamily: SANS, fontWeight: 400, cursor: 'pointer',
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20,
            }}
          >
            Sign in after confirming
          </button>
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
            {mode === 'create' ? 'Start your free month' : 'Welcome back'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.6 }}>
            {mode === 'create'
              ? 'Full access for 30 days. No card required.'
              : 'Access your account to view the full analysis.'}
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
            {loading ? 'Please wait…' : mode === 'create' ? 'Create account — start free month' : 'Sign in'}
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

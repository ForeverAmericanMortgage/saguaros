'use client';
import { useState } from 'react';
import styles from './organizer.module.css';
export default function ChairmanSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signIn() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/olympiad/auth/chairman/start', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); setBusy(false); }
  }
  return <main className={styles.main}><p>OLYMPIAD · CHAIRMAN</p><h1>Chairman dashboard</h1>
    <p>Sign in with your invited Saguaros Google account.</p>
    <button disabled={busy} onClick={signIn}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
    {error && <p role="alert">{error}</p>}
    <p>If access was declined, check your Google account or contact the chairman.</p>
    <a href="https://scottsdaleolympiad.com">Visit the public Olympiad website →</a>
  </main>;
}

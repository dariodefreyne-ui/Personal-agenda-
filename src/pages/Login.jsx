import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { APP_NAAM } from '../config/appConfig';

const fouten = {
  'auth/invalid-credential': 'E-mail of wachtwoord klopt niet.',
  'auth/invalid-email': 'Ongeldig e-mailadres.',
  'auth/user-not-found': 'Geen account met dit e-mailadres.',
  'auth/wrong-password': 'Verkeerd wachtwoord.',
  'auth/too-many-requests': 'Te veel pogingen. Probeer straks opnieuw.',
};

export default function Login() {
  const { login, wachtwoordVergeten } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [ww, setWw] = useState('');
  const [bezig, setBezig] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBezig(true);
    try {
      await login(email.trim(), ww);
    } catch (err) {
      toast(fouten[err?.code] || 'Aanmelden mislukt.');
    } finally {
      setBezig(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) return toast('Vul eerst je e-mailadres in.');
    try {
      await wachtwoordVergeten(email.trim());
      toast('Reset-mail verstuurd (check ook spam).');
    } catch {
      toast('Kon reset-mail niet versturen.');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <div className="card stack" style={{ width: '100%', maxWidth: 380 }}>
        <div className="center stack" style={{ gap: 4 }}>
          <img src="/icon.svg" alt="" width="56" height="56" style={{ margin: '0 auto 6px' }} />
          <h1>{APP_NAAM}</h1>
          <p className="muted small">Meld je aan om verder te gaan</p>
        </div>
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" className="input" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ww">Wachtwoord</label>
            <input id="ww" className="input" type="password" autoComplete="current-password"
              value={ww} onChange={(e) => setWw(e.target.value)} required />
          </div>
          <button className="btn primary block" type="submit" disabled={bezig}>
            {bezig ? 'Bezig…' : 'Aanmelden'}
          </button>
        </form>
        <button className="btn ghost sm" onClick={reset}>Wachtwoord vergeten?</button>
      </div>
    </div>
  );
}

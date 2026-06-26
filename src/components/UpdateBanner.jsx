import { useRegisterSW } from 'virtual:pwa-register/react';

// Toont een banner wanneer er een nieuwe app-versie klaarstaat.
export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) { console.warn('SW-registratie fout:', err); },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status">
      <span className="grow small">Nieuwe versie beschikbaar</span>
      <button className="btn sm primary" onClick={() => updateServiceWorker(true)}>Vernieuwen</button>
      <button className="icon-btn" aria-label="Later" onClick={() => setNeedRefresh(false)}>✕</button>
    </div>
  );
}

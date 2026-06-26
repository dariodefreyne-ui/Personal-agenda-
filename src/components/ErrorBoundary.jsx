import { Component } from 'react';

// Vangt render-fouten op zodat de app nooit een wit scherm toont.
export default class ErrorBoundary extends Component {
  state = { fout: null };
  static getDerivedStateFromError(fout) { return { fout }; }
  componentDidCatch(fout, info) { console.error('App-fout:', fout, info); }
  render() {
    if (this.state.fout) {
      return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
          <div className="card stack center" style={{ maxWidth: 360 }}>
            <h2 style={{ margin: 0 }}>Er ging iets mis</h2>
            <p className="small muted" style={{ margin: 0 }}>
              De app liep tegen een onverwachte fout. Herlaad om verder te gaan.
            </p>
            <button className="btn primary block" onClick={() => window.location.reload()}>Herladen</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

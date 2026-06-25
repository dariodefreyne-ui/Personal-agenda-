import { createContext, useContext, useEffect, useState } from 'react';
import { THEMES } from '../config/appConfig';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const KEY = 'pa_theme';
const geldig = (id) => THEMES.some((t) => t.id === id);

export function ThemeProvider({ children }) {
  const [thema, setThemaState] = useState(() => {
    try {
      const v = localStorage.getItem(KEY);
      return geldig(v) ? v : 'middernacht';
    } catch { return 'middernacht'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', thema);
    const meta = document.querySelector('meta[name="theme-color"]');
    const kleurBg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (meta && kleurBg) meta.setAttribute('content', kleurBg);
  }, [thema]);

  const setThema = (id) => {
    if (!geldig(id)) return;
    setThemaState(id);
    try { localStorage.setItem(KEY, id); } catch { /* negeer */ }
  };

  return (
    <ThemeContext.Provider value={{ thema, setThema, themas: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

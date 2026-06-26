import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getInstellingen, saveInstellingen } from '../services/data';

// Laadt de instellingen één keer per sessie (i.p.v. 5 reads op elke pagina)
// en houdt ze in geheugen. Schrijven werkt optimistisch + persisteert.
const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [instellingen, setInstellingen] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    if (!user) { setInstellingen(null); setLaden(false); return; }
    let actief = true;
    setLaden(true);
    getInstellingen(user.uid).then((data) => {
      if (actief) { setInstellingen(data); setLaden(false); }
    });
    return () => { actief = false; };
  }, [user]);

  const opslaan = useCallback(async (rubriek, patch) => {
    if (!user) return;
    let nieuw;
    setInstellingen((cur) => {
      nieuw = { ...(cur || {}), [rubriek]: { ...((cur || {})[rubriek] || {}), ...patch } };
      return nieuw;
    });
    await saveInstellingen(user.uid, rubriek, { ...((instellingen || {})[rubriek] || {}), ...patch });
  }, [user, instellingen]);

  return (
    <SettingsContext.Provider value={{ instellingen, laden, opslaan }}>
      {children}
    </SettingsContext.Provider>
  );
}

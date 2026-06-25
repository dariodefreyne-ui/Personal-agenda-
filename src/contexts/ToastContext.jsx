import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [bericht, setBericht] = useState(null);
  const timer = useRef(null);

  const toast = useCallback((tekst) => {
    setBericht(tekst);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBericht(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {bericht && <div className="toast" role="status" aria-live="polite">{bericht}</div>}
    </ToastContext.Provider>
  );
}

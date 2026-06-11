import { useEffect, useRef, useState } from 'react';
import { InvitationData } from '../types';

const STORAGE_KEY = 'harusi_form_data';
const STORAGE_VERSION = '1';

export function useFormPersistence(
  data: InvitationData,
  setData: (data: InvitationData) => void
) {
  const [hasSaved, setHasSaved] = useState(false);
  // Skip the very first render's save so we don't overwrite loaded data with defaults
  const skipNextSaveRef = useRef(true);

  // Load on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed._version === STORAGE_VERSION) {
          const { _version, _savedAt, ...formData } = parsed;
          setData(formData as InvitationData);
        }
      }
    } catch (err) {
      console.warn('Could not restore form data:', err);
    }
  }, [setData]);

  // Debounced save on every change
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        const toSave = {
          ...data,
          _version: STORAGE_VERSION,
          _savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        setHasSaved(true);
      } catch (err) {
        console.warn('Could not save form data:', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  const clearSavedData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silent — private browsing or quota exceeded
    }
  };

  return { clearSavedData, hasSaved };
}

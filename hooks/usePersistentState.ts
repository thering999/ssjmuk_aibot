import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * A custom hook to manage state that persists in localStorage.
 * It has the same signature as useState but saves the value to localStorage on change.
 * @param key The key to use in localStorage.
 * @param defaultValue The default value to use if nothing is in localStorage.
 * @returns A stateful value, and a function to update it.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}
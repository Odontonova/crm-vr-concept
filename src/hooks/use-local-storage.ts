import { useState, useEffect } from 'react';

function getValue<T>(key: string, initialValue: T | (() => T)) {
  if (typeof window === 'undefined') {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }
  try {
    const savedValue = JSON.parse(localStorage.getItem(key) || 'null');
    if (savedValue !== null) return savedValue;
  } catch (error) {
    console.error("Error parsing localStorage key:", key, error);
  }

  if (initialValue instanceof Function) return initialValue();
  return initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    return getValue(key, initialValue);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error setting localStorage key:", key, error);
    }
  }, [value, key]);

  return [value, setValue] as const;
}
import type { ScreenKey } from './screenKeys';
import React, { createContext, useContext } from 'react';

const MainLayoutNavContext = createContext<((key: ScreenKey) => void) | null>(null);

export function useMainLayoutNav(): (key: ScreenKey) => void {
  const fn = useContext(MainLayoutNavContext);
  return (key: ScreenKey) => {
    if (fn) fn(key);
  };
}

export const MainLayoutNavProvider = MainLayoutNavContext.Provider;

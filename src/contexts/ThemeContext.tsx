import React, { createContext, useContext } from 'react';
import { useTheme, Theme, darkTheme } from '../hooks/useTheme';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): Theme {
  return useContext(ThemeContext);
}

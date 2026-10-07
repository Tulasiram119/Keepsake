import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Returns 'light' until mounted to avoid SSR / initial hydration mismatch */
export function useColorScheme(): 'light' | 'dark' {
  const [hasMounted, setHasMounted] = useState(false);
  const colorScheme = useRNColorScheme();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return 'light';
  }

  return colorScheme === 'dark' ? 'dark' : 'light';
}

import { useState, useEffect, useCallback } from 'react';

export type Route = '/' | '/klondike' | '/blackjack' | '/freecell';

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/klondike') return '/klondike';
  if (path === '/blackjack') return '/blackjack';
  if (path === '/freecell') return '/freecell';
  return '/';
}

export function useHashRoute(): { route: Route; navigate: (r: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = r === '/' ? '' : r;
  }, []);

  return { route, navigate };
}

import { useEffect, useState } from 'react';

import { normalizeSearchTerm, normalizeUsername, type PublicProfile } from '@/domain/usernames';
import { lookupUsername, searchPeople } from '@/lib/people';

export const SEARCH_DEBOUNCE_MS = 300;

type SearchState = { results: PublicProfile[]; status: 'error' | 'idle' | 'loading' | 'ready'; term: string };

const IDLE: SearchState = { results: [], status: 'idle', term: '' };

/**
 * Debounced people search. Prefix matches come from discoverable people; an
 * exact username also resolves for people who chose not to be listed.
 * Results for an older term are never shown.
 */
export function usePeopleSearch(input: { blockedIds: ReadonlySet<string>; selfId: string | undefined; term: string }) {
  const { blockedIds, selfId, term } = input;
  const query = normalizeSearchTerm(term);
  const [state, setState] = useState<SearchState>(IDLE);

  useEffect(() => {
    if (!query || !selfId) return;
    let active = true;
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, status: 'loading', term: query }));
      Promise.all([
        searchPeople({ blockedIds, selfId, term: query }),
        lookupUsername(normalizeUsername(query)).catch(() => null),
      ]).then(([matches, exact]) => {
        if (!active) return;
        const hasExact = exact && exact.userId !== selfId && !blockedIds.has(exact.userId) && !matches.some((match) => match.userId === exact.userId);
        setState({ results: hasExact ? [exact, ...matches] : matches, status: 'ready', term: query });
      }).catch(() => {
        if (active) setState({ results: [], status: 'error', term: query });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [blockedIds, query, selfId]);

  if (!query) return IDLE;
  return state.term === query ? state : { results: [], status: 'loading' as const, term: query };
}

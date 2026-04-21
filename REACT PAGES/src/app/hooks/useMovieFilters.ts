import { useState } from 'react';
import { getServices, SERVICE_DISPLAY } from '../services/api';

export interface FilterState {
  filterStreaming: boolean;
  minRating: number[];
  actor: string;
  director: string;
  yearFrom: string;
  yearTo: string;
  genre: string;
  sortBy: string;
}

/** Returns a fresh default filter state object. Call once per module-level store. */
export function defaultFilterState(): FilterState {
  return {
    filterStreaming: false,
    minRating: [0],
    actor: '',
    director: '',
    yearFrom: '',
    yearTo: '',
    genre: '',
    sortBy: 'popularity',
  };
}

/**
 * Manages all shared movie filter state.
 *
 * Pass a module-level `store` object so that state survives React Router
 * remounts (tab switches). Each component that wants persistence should
 * declare its own module-level store with `defaultFilterState()` and pass
 * it here — the hook initialises from the store on mount and writes back
 * on every setter call, so the next mount picks up where the user left off.
 */
export function useMovieFilters(store: FilterState) {
  const [filterStreaming, _setFilterStreaming] = useState(store.filterStreaming);
  const [minRating,       _setMinRating]       = useState(store.minRating);
  const [actor,           _setActor]           = useState(store.actor);
  const [director,        _setDirector]        = useState(store.director);
  const [yearFrom,        _setYearFrom]        = useState(store.yearFrom);
  const [yearTo,          _setYearTo]          = useState(store.yearTo);
  const [genre,           _setGenre]           = useState(store.genre);
  const [sortBy,          _setSortBy]          = useState(store.sortBy);

  // Each setter writes through to the module-level store for persistence
  const setFilterStreaming = (v: boolean)  => { store.filterStreaming = v; _setFilterStreaming(v); };
  const setMinRating       = (v: number[]) => { store.minRating = v;       _setMinRating(v); };
  const setActor           = (v: string)   => { store.actor = v;           _setActor(v); };
  const setDirector        = (v: string)   => { store.director = v;        _setDirector(v); };
  const setYearFrom        = (v: string)   => { store.yearFrom = v;        _setYearFrom(v); };
  const setYearTo          = (v: string)   => { store.yearTo = v;          _setYearTo(v); };
  const setGenre           = (v: string)   => { store.genre = v;           _setGenre(v); };
  const setSortBy          = (v: string)   => { store.sortBy = v;          _setSortBy(v); };

  const userServices       = getServices();
  const hasServices        = Object.values(userServices).some(Boolean);
  const activeServiceNames = Object.entries(userServices)
    .filter(([, on]) => on)
    .map(([key]) => SERVICE_DISPLAY[key]);

  function clearFilters() {
    setFilterStreaming(false);
    setMinRating([0]);
    setActor('');
    setDirector('');
    setYearFrom('');
    setYearTo('');
    setGenre('');
    setSortBy('popularity');
  }

  return {
    filterStreaming, setFilterStreaming,
    minRating,       setMinRating,
    actor,           setActor,
    director,        setDirector,
    yearFrom,        setYearFrom,
    yearTo,          setYearTo,
    genre,           setGenre,
    sortBy,          setSortBy,
    userServices, hasServices, activeServiceNames,
    clearFilters,
  };
}

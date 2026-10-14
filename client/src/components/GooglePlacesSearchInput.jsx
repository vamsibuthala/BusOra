import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Crosshair, 
  GraduationCap, 
  Bus, 
  Train, 
  Landmark, 
  Compass,
  Check
} from 'lucide-react';
import { searchLocationSuggestions } from '../services/placesService';

export default function GooglePlacesSearchInput({
  label,
  placeholder = 'Search village, campus, station, or landmark...',
  value = '',
  onChange,
  onSelectPlace,
  iconType = 'origin', // 'origin' | 'destination' | 'stop'
  required = false,
  onPickOnMap = null,
  isPickingOnMap = false,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes (with 150ms debounce)
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val || val.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocationSuggestions(val);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Failed to get suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);
  };

  const handleSelect = (place) => {
    setQuery(place.name);
    setIsOpen(false);
    if (onChange) onChange(place.name);
    if (onSelectPlace) onSelectPlace(place);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    if (onChange) onChange('');
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // If user pressed enter, resolve query immediately
        if (query.trim()) {
          searchLocationSuggestions(query).then((res) => {
            if (res.length > 0) handleSelect(res[0]);
          });
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Icon based on type
  const getLeadingIcon = () => {
    if (iconType === 'origin') {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0">
          A
        </div>
      );
    }
    if (iconType === 'destination') {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-black shrink-0">
          B
        </div>
      );
    }
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold shrink-0">
        <MapPin className="h-3.5 w-3.5" />
      </div>
    );
  };

  // Place category icon in dropdown
  const getPlaceIcon = (type) => {
    switch (type) {
      case 'university':
      case 'college':
        return <GraduationCap className="h-4 w-4 text-purple-600" />;
      case 'bus_station':
        return <Bus className="h-4 w-4 text-sky-600" />;
      case 'railway_station':
        return <Train className="h-4 w-4 text-amber-600" />;
      case 'landmark':
        return <Landmark className="h-4 w-4 text-rose-600" />;
      default:
        return <MapPin className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5">
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
          {onPickOnMap && (
            <button
              type="button"
              onClick={onPickOnMap}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                isPickingOnMap
                  ? 'bg-purple-600 text-white animate-pulse'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
              title="Click on the map to set this point"
            >
              <Crosshair className="h-3 w-3" />
              <span>{isPickingOnMap ? 'Click map to set' : 'Pick on Map'}</span>
            </button>
          )}
        </div>
      )}

      {/* Google Maps Search Bar Input */}
      <div className="relative flex items-center rounded-2xl border-2 border-slate-200 bg-white shadow-2xs hover:border-slate-300 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
        <div className="pl-3">{getLeadingIcon()}</div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        {/* Clear & Loading Icons */}
        <div className="flex items-center gap-1 pr-3">
          {isLoading && (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          )}

          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Google Maps-Style Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 py-1.5 animate-fade-in">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Google Maps Place Suggestions</span>
            <span>{suggestions.length} matches</span>
          </div>

          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={item.id || idx}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                  isHighlighted ? 'bg-purple-50 text-purple-900' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                  isHighlighted ? 'bg-purple-100' : 'bg-slate-100'
                }`}>
                  {getPlaceIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span className="truncate">{item.name}</span>
                    {item.source === 'verified' && (
                      <span className="rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1 py-0.2 shrink-0">
                        Campus Match
                      </span>
                    )}
                  </div>
                  {item.secondary && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.secondary}
                    </div>
                  )}
                </div>

                {isHighlighted && (
                  <Check className="h-4 w-4 text-purple-600 shrink-0 self-center" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

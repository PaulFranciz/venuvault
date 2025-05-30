"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import EventSearchThumbnail from "./EventSearchThumbnail";
import { useEventSearch, type SearchResult } from "../hooks/queries/useSearchQueries";
import dayjs from "dayjs";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Use our enhanced search hook with built-in debouncing and caching
  const { 
    data: searchResults, 
    isLoading, 
    debouncedSearchTerm,
    prefetchEventDetails
  } = useEventSearch(query, {
    debounceMs: 300,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
  
  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
    }
  };
  
  const clearSearch = () => {
    setQuery("");
    setShowResults(false);
  };

  // Format date for display
  const formatEventDate = (timestamp: number) => {
    return dayjs(timestamp).format('MMM D, YYYY');
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative" ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search for events..."
          className="w-full py-3 px-4 pl-12 bg-white rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F96521]/70 focus:border-transparent transition-all duration-200"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#F96521] text-white px-4 py-1.5 rounded-lg text-sm font-pally-medium hover:bg-[#F96521]/90 transition-colors duration-200"
        >
          Search
        </button>
      </form>
      
      {/* Live search results */}
      {showResults && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {isLoading && !searchResults ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-4 w-4 rounded-full bg-[#F96521] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-4 w-4 rounded-full bg-[#F96521] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-4 w-4 rounded-full bg-[#F96521] animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-gray-500 mt-2">Searching...</p>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <>
              <div className="p-3 border-b border-gray-100">
                <p className="text-sm text-gray-500 font-pally-medium">Results for "{query}"</p>
              </div>
              <ul>
                {searchResults.map((result) => (
                  <li key={result._id} className="border-b border-gray-100 last:border-0">
                    <Link 
                      href={`/event/${result._id}`}
                      onClick={() => setShowResults(false)}
                      onMouseEnter={() => {
                        // Prefetch the event details when hovering over a result
                        prefetchEventDetails(result._id);
                      }}
                      className="block p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-3">
                        <EventSearchThumbnail result={result} />
                        <div className="flex-1">
                          <p className="font-pally-medium text-gray-900">{result.name}</p>
                          <div className="flex justify-between mt-1">
                            <p className="text-sm text-gray-500">{result.location}</p>
                            <p className="text-sm text-[#F96521]">{formatEventDate(result.eventDate)}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button 
                  onClick={handleSearch}
                  className="w-full text-center text-[#F96521] text-sm font-pally-medium hover:text-[#F96521]/80 transition-colors"
                >
                  See all results
                </button>
              </div>
            </>
          ) : debouncedSearchTerm.length > 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500">No results found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-500">Type to search...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
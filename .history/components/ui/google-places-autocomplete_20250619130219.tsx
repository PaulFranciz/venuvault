'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMapsScript, PlaceDetails } from '@/lib/googleMaps';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  countryCode?: string;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a location...",
  className,
  disabled = false,
  countryCode = 'ng'
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state when the value prop changes from the parent
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      console.warn('Autocomplete place selection did not return a valid place object.');
      return;
    }
    
    const placeDetails: PlaceDetails = {
        place_id: place.place_id || '',
        formatted_address: place.formatted_address || '',
        name: place.name,
        geometry: {
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        },
        address_components: place.address_components || [],
        types: place.types || []
    };

    const newAddress = place.formatted_address || '';
    setInputValue(newAddress); // Update local state for the input
    onChange(newAddress); // Update parent form state
    onPlaceSelect(placeDetails);

  }, [onChange, onPlaceSelect]);

  useEffect(() => {
    const initialize = async () => {
      if (!inputRef.current) return;

      try {
        await loadGoogleMapsScript();

        if (window.google && window.google.maps && window.google.maps.places) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['establishment', 'geocode'],
                componentRestrictions: countryCode ? { country: countryCode } : undefined,
                fields: [
                    'place_id',
                    'formatted_address',
                    'name',
                    'geometry.location',
                    'address_components',
                    'types'
                ]
            });

            autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
        } else {
            throw new Error("Google Maps Places library not available.");
        }

      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        const pacContainers = document.getElementsByClassName('pac-container');
        for (let i = 0; i < pacContainers.length; i++) {
            pacContainers[i].remove();
        }
      }
    };
  }, [countryCode, handlePlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };
  
  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue || ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={cn(
            "pl-10 pr-10",
            className
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
    </div>
  );
} 
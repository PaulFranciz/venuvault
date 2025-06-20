'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMapsScript, parseAddressComponents, PlaceDetails } from '@/lib/googleMaps';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  countryCode?: string; // e.g., 'ng' for Nigeria
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
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const isPlaceSelection = useRef(false);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current) return;

      try {
        setIsLoading(true);
        await loadGoogleMapsScript();
        setIsGoogleMapsLoaded(true);

        // Create autocomplete instance
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
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

        autocompleteRef.current = autocomplete;

        // Add place selection listener
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (!place.geometry || !place.geometry.location) {
            console.warn('Place has no geometry');
            return;
          }

          // Mark this as a place selection to prevent conflicts
          isPlaceSelection.current = true;

          // Convert to our PlaceDetails interface
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

          // Update local input value to match the selected place
          const selectedAddress = place.formatted_address || '';
          setInputValue(selectedAddress);
          
          onPlaceSelect(placeDetails);

          // Reset the flag after a small delay
          setTimeout(() => {
            isPlaceSelection.current = false;
          }, 100);
        });

      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [countryCode, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Sync external value changes with internal state (only when externally controlled)
  useEffect(() => {
    if (value !== inputValue && value !== undefined) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent form submission when Enter is pressed on autocomplete
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
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
      
      {!isGoogleMapsLoaded && !isLoading && (
        <p className="text-xs text-yellow-500 mt-1">
          Google Maps is loading...
        </p>
      )}
    </div>
  );
} 
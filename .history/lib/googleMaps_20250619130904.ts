// Google Maps API utilities
// This file contains utilities for integrating with Google Maps Places API and Maps JavaScript API

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  types: string[];
}

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  country?: string;
  postalCode?: string;
}

// Parse address components from Google Places API response
export function parseAddressComponents(addressComponents: PlaceDetails['address_components']): AddressComponents {
  const components: AddressComponents = {};

  addressComponents.forEach((component) => {
    const { types, long_name } = component;

    if (types.includes('street_number')) {
      components.streetNumber = long_name;
    } else if (types.includes('route')) {
      components.route = long_name;
    } else if (types.includes('locality')) {
      components.locality = long_name;
    } else if (types.includes('administrative_area_level_1')) {
      components.administrativeAreaLevel1 = long_name;
    } else if (types.includes('country')) {
      components.country = long_name;
    } else if (types.includes('postal_code')) {
      components.postalCode = long_name;
    }
  });

  return components;
}

// Load Google Maps JavaScript API
export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

// Generate Google Maps embed URL
export function generateMapEmbedUrl(address: string): string {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedAddress}&zoom=15`;
}

// Generate static map URL for previews
export function generateStaticMapUrl(lat: number, lng: number, zoom: number = 15): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=400x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
}

// Declare global types for Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
} 
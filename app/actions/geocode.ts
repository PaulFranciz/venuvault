'use server';

import { revalidatePath } from 'next/cache';

export async function geocodeAddress(address: string) {
  try {
    if (!address) {
      return { 
        success: false,
        error: 'Address is required' 
      };
    }

    // Use the API key directly for now
    // In production, this would be an environment variable
    const apiKey = 'a10ac05696304bcf9c07cf7bb41102b9';
    
    // Preserve the original address for later use
    const originalAddress = address.trim();
    
    // Only append country if the address is detailed enough (contains street or building number)
    // and doesn't already specify a country
    let searchQuery = originalAddress;
    
    // Check if the address is likely to be specific enough (contains numbers, which usually indicate street/building)
    const hasNumbers = /\d/.test(searchQuery);
    const hasMultipleWords = searchQuery.split(' ').length > 2;
    
    // Only append country if the address is specific and doesn't already mention Nigeria or Lagos
    if (hasNumbers && hasMultipleWords && 
        !searchQuery.toLowerCase().includes('nigeria') && 
        !searchQuery.toLowerCase().includes('lagos')) {
      searchQuery += ', Nigeria';
    }
    
    console.log('Original address:', originalAddress);
    console.log('Search query:', searchQuery);
    
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(searchQuery)}&key=${apiKey}&limit=1`;
    
    console.log('Geocoding request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Geocoding service error: ${response.status}`);
      return { 
        success: false,
        error: `Geocoding service error: ${response.status}` 
      };
    }

    const data = await response.json();
    console.log('Full OpenCage API response:', JSON.stringify(data, null, 2));
    
    if (!data.results || data.results.length === 0) {
      return { 
        success: false,
        error: 'Address not found' 
      };
    }

    const result = data.results[0];
    console.log('Result data:', JSON.stringify(result, null, 2));
    
    // Extract components more reliably
    const { components, formatted, geometry } = result;
    
    // Handle different property naming in OpenCage API
    const city = components.city || components.town || components.village || components.county || '';
    const state = components.state || components.region || '';
    const country = components.country || '';
    const zipCode = components.postcode || components.postal_code || '';
    
    // Check if the result is too generic (just country or region)
    const isGenericResult = 
      formatted === country || 
      formatted === state || 
      components._type === 'country' || 
      components._type === 'region';
    
    // If the result is too generic and we had a specific address to begin with, keep the original
    const finalAddress = isGenericResult ? originalAddress : formatted;
    
    // Nigerian cities fallback for when OpenCage returns only country data
    // Extract city from address if possible
    let extractedCity = '';
    let extractedState = '';
    
    // Common Nigerian cities to check for in the address
    const nigerianCities = [
      'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Maiduguri', 'Kaduna', 
      'Zaria', 'Aba', 'Jos', 'Ilorin', 'Oyo', 'Enugu', 'Abeokuta', 'Onitsha', 'Warri', 'Calabar', 
      'Uyo', 'Akure', 'Osogbo', 'Bauchi', 'Makurdi', 'Minna', 'Effon Alaiye', 'Lokoja', 'Sokoto', 
      'Abakaliki', 'Owerri', 'Yola', 'Jalingo', 'Ado-Ekiti', 'Gombe', 'Akwa', 'Yenagoa', 'Ikeja'
    ];
    
    // Common Nigerian states
    const nigerianStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
      'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
      'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ];
    
    // Try to extract city or state from the address if not provided by OpenCage
    if (isGenericResult && originalAddress) {
      // Check if any known Nigerian city is in the address
      for (const cityName of nigerianCities) {
        if (originalAddress.toLowerCase().includes(cityName.toLowerCase())) {
          extractedCity = cityName;
          break;
        }
      }
      
      // Check if any known Nigerian state is in the address
      for (const stateName of nigerianStates) {
        if (originalAddress.toLowerCase().includes(stateName.toLowerCase())) {
          extractedState = stateName;
          break;
        }
      }
    }
    
    // Revalidate the path to ensure fresh data
    revalidatePath('/create-event');
    
    // Use extracted values if OpenCage didn't provide them but we found them in the address
    const finalCity = city || extractedCity || '';
    const finalState = state || extractedState || '';
    
    console.log('Final geocoding result:', {
      address: finalAddress,
      city: finalCity,
      state: finalState,
      country,
      zipCode
    });
    
    return {
      success: true,
      address: finalAddress,
      city: finalCity,
      state: finalState,
      country: country || 'Nigeria', // Default to Nigeria if no country returned
      zipCode,
      // Include coordinates for potential future mapping features
      coordinates: geometry ? { lat: geometry.lat, lng: geometry.lng } : undefined
    };
  } catch (error) {
    console.error('Error in geocodeAddress action:', error);
    return { 
      success: false,
      error: 'Internal server error' 
    };
  }
}

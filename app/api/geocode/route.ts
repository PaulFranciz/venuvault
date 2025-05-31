import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENCAGE_API_KEY || 'a10ac05696304bcf9c07cf7bb41102b9';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}&limit=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenCage API error: ${response.status}`, errorText);
      
      return NextResponse.json(
        { error: `Geocoding service error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    const result = data.results[0];
    const { components, formatted } = result;
    
    return NextResponse.json({
      address: formatted,
      city: components.city || components.town || components.village || '',
      state: components.state || components.county || '',
      country: components.country || '',
      zipCode: components.postcode || ''
    });
  } catch (error) {
    console.error('Error in geocode API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

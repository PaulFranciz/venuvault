import * as React from 'react';
import { EventFormData } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Globe, Video, Link2, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { useEventForm } from '@/providers/EventFormProvider';
import { toast } from 'sonner';
import { geocodeAddress } from '@/app/actions/geocode';

// Nigerian cities for the dropdown
const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Calabar',
  'Kaduna', 'Maiduguri', 'Enugu', 'Aba', 'Onitsha', 'Warri', 'Ilorin', 'Uyo',
  'Jos', 'Zaria', 'Akure', 'Sokoto', 'Owerri', 'Yola', 'Abeokuta', 'Makurdi',
  'Ado-Ekiti', 'Minna', 'Umuahia', 'Lokoja', 'Asaba', 'Yenagoa', 'Gombe',
  'Jalingo', 'Dutse', 'Birnin Kebbi', 'Osogbo', 'Damaturu', 'Bauchi', 'Awka',
  'Ikeja', 'Ogbomosho', 'Ife', 'Abakaliki', 'Ilesha', 'Ila', 'Shagamu', 'Owo'
];

// Nigerian states for the dropdown
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

interface LocationStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const LocationStep: React.FC<LocationStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  const [isAddressVerified, setIsAddressVerified] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [linkPreview, setLinkPreview] = React.useState<{
    platform: 'zoom' | 'google-meet' | 'teams' | 'youtube' | 'other' | 'invalid';
    icon: React.ReactNode;
    name: string;
    color: string;
    isValid: boolean;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
    
    if (name === 'virtualLink') {
      analyzeVirtualLink(value);
    }
    
    // Reset verified status when address is changed
    if (name === 'address') {
      setIsAddressVerified(false);
    }
  };

  // Function to analyze and categorize the virtual link
  const analyzeVirtualLink = React.useCallback((url: string) => {
    if (!url.trim()) {
      setLinkPreview(null);
      return;
    }
    
    // Try to parse the URL to validate it
    let isValid = false;
    try {
      // Add https if not present to help URL parsing
      const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
      new URL(urlToCheck);
      isValid = true;
    } catch (e) {
      setLinkPreview({
        platform: 'invalid',
        icon: <AlertCircle className="h-5 w-5" />,
        name: 'Invalid URL',
        color: '#ff4747',
        isValid: false
      });
      return;
    }
    
    // Detect platform based on URL patterns
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('zoom.us') || lowerUrl.includes('zoomgov.com')) {
      setLinkPreview({
        platform: 'zoom',
        icon: <Video className="h-5 w-5" />,
        name: 'Zoom Meeting',
        color: '#2D8CFF',
        isValid
      });
    } else if (lowerUrl.includes('meet.google.com')) {
      setLinkPreview({
        platform: 'google-meet',
        icon: <Video className="h-5 w-5" />,
        name: 'Google Meet',
        color: '#00897B',
        isValid
      });
    } else if (lowerUrl.includes('teams.microsoft.com') || lowerUrl.includes('teams.live.com')) {
      setLinkPreview({
        platform: 'teams',
        icon: <Video className="h-5 w-5" />,
        name: 'Microsoft Teams',
        color: '#6264A7',
        isValid
      });
    } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      setLinkPreview({
        platform: 'youtube',
        icon: <Video className="h-5 w-5" />,
        name: 'YouTube',
        color: '#FF0000',
        isValid
      });
    } else {
      setLinkPreview({
        platform: 'other',
        icon: <Link2 className="h-5 w-5" />,
        name: 'Virtual Event',
        color: '#F96521',
        isValid
      });
    }
  }, [setLinkPreview]);

  // Set default locationType and country if not already set
  React.useEffect(() => {
    const updates: Partial<EventFormData> = {};
    
    if (!formData.locationType) {
      updates.locationType = 'physical';
    }
    
    if (!formData.country) {
      updates.country = 'Nigeria';
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(updates);
    }
  }, [formData.locationType, formData.country, setFormData]);

  const verifyAddress = async () => {
    if (!formData.address) {
      toast.error("Address required", {
        description: "Please enter an address to verify.",
      });
      return;
    }
    
    setIsVerifying(true);
    setIsAddressVerified(false);
    
    try {
      // If country is Nigeria and not specified in address, append it
      let addressToVerify = formData.address;
      if (formData.country === 'Nigeria' && !addressToVerify.toLowerCase().includes('nigeria')) {
        addressToVerify = `${addressToVerify}, Nigeria`;
      }
      
      console.log('Verifying address:', addressToVerify);
      
      // Call our server action
      const result = await geocodeAddress(addressToVerify);
      
      if (!result.success) {
        console.error('Geocoding error:', result.error);
        toast.error(result.error || 'Verification failed', {
          description: "Please check the address and try again."
        });
        return;
      }
      
      console.log('Geocoding response data:', result);
      
      // Determine what data to use from the geocoding result
      // Keep the user's input for fields that are missing in the API response
      const updateData: Partial<EventFormData> = {
        address: result.address || formData.address,
        city: result.city || formData.city || '',
        state: result.state || formData.state || '',
        country: result.country || formData.country || 'Nigeria',
        zipCode: result.zipCode || formData.zipCode || ''
      };
      
      console.log('Updating form with data:', updateData);
      
      // Update the form with the geocoded data
      setFormData({
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        country: updateData.country,
        zipCode: updateData.zipCode
      });
      
      setIsAddressVerified(true);
      
      // Check if we're missing any important location data
      const isPartialData = !updateData.city || !updateData.state;
      
      if (isPartialData) {
        toast.success("Address partially verified", {
          description: "Some location details couldn't be automatically filled. Please select from the dropdown options.",
        });
      } else {
        toast.success("Address verified", {
          description: "Location details have been filled automatically.",
        });
      }
    } catch (error) {
      console.error('Error verifying address:', error);
      toast.error("Verification failed", {
        description: "There was an error verifying the address. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLocationTypeChange = (value: 'physical' | 'virtual') => {
    setFormData({ locationType: value });
  };

  const isNextDisabled = formData.locationType === 'physical' 
    ? !formData.address || !formData.city || !formData.country
    : !formData.virtualLink;

  return (
    <div className="text-white">
      <div className="space-y-6">
        <div>
          <Label className="block text-white mb-4">Location Type</Label>
          <RadioGroup 
            value={formData.locationType} 
            onValueChange={(value: string) => handleLocationTypeChange(value as 'physical' | 'virtual')}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="relative">
              <RadioGroupItem
                value="physical"
                id="physical"
                className="peer sr-only"
              />
              <Label
                htmlFor="physical"
                className="flex items-center gap-3 p-4 border border-[#3B3B3B] rounded-lg cursor-pointer transition-all 
                hover:border-[#F96521] hover:bg-[#2C2C2C] 
                peer-checked:border-[#F96521] peer-checked:bg-[#2C2C2C]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3B3B3B] text-[#F96521]">
                  <MapPin className="h-6 w-6" />
                </div>
                <span className="text-white">Physical Location</span>
              </Label>
            </div>

            <div className="relative">
              <RadioGroupItem
                value="virtual"
                id="virtual"
                className="peer sr-only"
              />
              <Label
                htmlFor="virtual"
                className="flex items-center gap-3 p-4 border border-[#3B3B3B] rounded-lg cursor-pointer transition-all 
                hover:border-[#F96521] hover:bg-[#2C2C2C] 
                peer-checked:border-[#F96521] peer-checked:bg-[#2C2C2C]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3B3B3B] text-[#F96521]">
                  <Globe className="h-6 w-6" />
                </div>
                <span className="text-white">Virtual Event</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {formData.locationType === 'physical' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address" className="block text-white mb-2">Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    placeholder="Enter complete address (e.g., 24 Broad St, Lagos)"
                    className={`bg-[#2C2C2C] border-[#3B3B3B] text-white pr-9 ${isAddressVerified ? 'border-green-500' : ''}`}
                    required
                  />
                  {isAddressVerified && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <Button 
                  type="button" 
                  onClick={verifyAddress} 
                  className="min-w-0 text-white bg-[#F96521] hover:bg-[#FF8142] h-10 px-3"
                  disabled={!formData.address || isVerifying}
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                For best results, include street, city and country in your address
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="block text-white mb-2">City</Label>
                <div className="relative">
                  <Input
                    id="city"
                    name="city"
                    list="city-options"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    placeholder="Select or type a city"
                    className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
                    required
                  />
                  <datalist id="city-options">
                    {NIGERIAN_CITIES.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <Label htmlFor="state" className="block text-white mb-2">State/Province</Label>
                <div className="relative">
                  <Input
                    id="state"
                    name="state"
                    list="state-options"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    placeholder="Select or type a state"
                    className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
                    required
                  />
                  <datalist id="state-options">
                    {NIGERIAN_STATES.map((state) => (
                      <option key={state} value={state} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country" className="block text-white mb-2">Country</Label>
                <select
                  id="country"
                  name="country"
                  value={formData.country || 'Nigeria'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md bg-[#2C2C2C] border border-[#3B3B3B] text-white focus:border-[#F96521] focus:ring-[#F96521]"
                  required
                >
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                  <option value="South Africa">South Africa</option>
                  <option value="">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="zipCode" className="block text-white mb-2">Postal/Zip Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode || ''}
                  onChange={handleInputChange}
                  placeholder="Postal/Zip Code"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="virtualLink" className="block text-white mb-2">Virtual Event Link</Label>
            <Input
              id="virtualLink"
              name="virtualLink"
              value={formData.virtualLink || ''}
              onChange={handleInputChange}
              placeholder="https://zoom.us/j/example"
              className={`bg-[#2C2C2C] border-[#3B3B3B] text-white ${linkPreview?.platform === 'invalid' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Enter the link where attendees will join your virtual event (Zoom, Google Meet, Microsoft Teams, etc.)
            </p>
            
            {/* Link Preview Section */}
            {linkPreview && (
              <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${linkPreview.platform === 'invalid' ? 'border-red-500 bg-red-500/10' : `border-${linkPreview.color} bg-[#2C2C2C]`}`}>
                <div
                  className="rounded-full p-2 flex items-center justify-center" 
                  style={{ backgroundColor: linkPreview.platform === 'invalid' ? 'rgba(255, 71, 71, 0.2)' : linkPreview.color }}
                >
                  {linkPreview.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{linkPreview.name}</p>
                    {linkPreview.isValid && linkPreview.platform !== 'invalid' && (
                      <a 
                        href={formData.virtualLink?.startsWith('http') ? formData.virtualLink : `https://${formData.virtualLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{formData.virtualLink}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="bg-transparent border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={onNext}
            className="bg-[#F96521] hover:bg-[#F96521]/90 text-white ml-auto"
            disabled={isNextDisabled || isSubmitting}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocationStep;

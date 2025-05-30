import * as React from 'react';
import { EventFormData } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventForm } from '@/providers/EventFormProvider';

interface DateTimeStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const timezones = [
  { value: 'GMT-12', label: '(GMT-12:00) International Date Line West' },
  { value: 'GMT-11', label: '(GMT-11:00) Midway Island, Samoa' },
  { value: 'GMT-10', label: '(GMT-10:00) Hawaii' },
  { value: 'GMT-9', label: '(GMT-09:00) Alaska' },
  { value: 'GMT-8', label: '(GMT-08:00) Pacific Time (US & Canada)' },
  { value: 'GMT-7', label: '(GMT-07:00) Mountain Time (US & Canada)' },
  { value: 'GMT-6', label: '(GMT-06:00) Central Time (US & Canada), Mexico City' },
  { value: 'GMT-5', label: '(GMT-05:00) Eastern Time (US & Canada), Bogota, Lima' },
  { value: 'GMT-4', label: '(GMT-04:00) Atlantic Time (Canada), Caracas, La Paz' },
  { value: 'GMT-3', label: '(GMT-03:00) Brazil, Buenos Aires, Georgetown' },
  { value: 'GMT-2', label: '(GMT-02:00) Mid-Atlantic' },
  { value: 'GMT-1', label: '(GMT-01:00) Azores, Cape Verde Islands' },
  { value: 'GMT+0', label: '(GMT+00:00) Western Europe Time, London, Lisbon, Casablanca' },
  { value: 'GMT+1', label: '(GMT+01:00) Brussels, Copenhagen, Madrid, Paris' },
  { value: 'GMT+2', label: '(GMT+02:00) Kaliningrad, South Africa' },
  { value: 'GMT+3', label: '(GMT+03:00) Baghdad, Riyadh, Moscow, St. Petersburg' },
  { value: 'GMT+4', label: '(GMT+04:00) Abu Dhabi, Muscat, Baku, Tbilisi' },
  { value: 'GMT+5', label: '(GMT+05:00) Ekaterinburg, Islamabad, Karachi, Tashkent' },
  { value: 'GMT+6', label: '(GMT+06:00) Almaty, Dhaka, Colombo' },
  { value: 'GMT+7', label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'GMT+8', label: '(GMT+08:00) Beijing, Perth, Singapore, Hong Kong' },
  { value: 'GMT+9', label: '(GMT+09:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk' },
  { value: 'GMT+10', label: '(GMT+10:00) Eastern Australia, Guam, Vladivostok' },
  { value: 'GMT+11', label: '(GMT+11:00) Magadan, Solomon Islands, New Caledonia' },
  { value: 'GMT+12', label: '(GMT+12:00) Auckland, Wellington, Fiji, Kamchatka' },
];

const DateTimeStep: React.FC<DateTimeStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleTimezoneChange = (value: string) => {
    setFormData({ timezone: value });
  };

  const isNextDisabled = !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime;

  return (
    <div className="text-white">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="block text-white mb-2">Start Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
              className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="startTime" className="block text-white mb-2">Start Time</Label>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleInputChange}
              className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="endDate" className="block text-white mb-2">End Date</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange}
              className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="endTime" className="block text-white mb-2">End Time</Label>
            <Input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleInputChange}
              className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="timezone" className="block text-white mb-2">Timezone</Label>
          <Select 
            value={formData.timezone} 
            onValueChange={handleTimezoneChange}
          >
            <SelectTrigger className="bg-[#2C2C2C] border-[#3B3B3B] text-white">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2C] border-[#3B3B3B] text-white">
              {timezones.map((timezone) => (
                <SelectItem key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

export default DateTimeStep;

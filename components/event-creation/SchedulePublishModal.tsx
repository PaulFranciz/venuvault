import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'; // Corrected import for Dialog
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // Ensure this path is correct
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);

interface SchedulePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSchedule: (scheduleDateTime: Date) => void;
  defaultDateTime?: Date;
  trigger?: React.ReactNode; // Added trigger prop
}

const SchedulePublishModal: React.FC<SchedulePublishModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirmSchedule,
  defaultDateTime,
  trigger // Destructure trigger
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    defaultDateTime || dayjs().add(1, 'hour').startOf('hour').toDate()
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    defaultDateTime ? dayjs(defaultDateTime).format('HH') : dayjs().add(1, 'hour').format('HH')
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    defaultDateTime ? dayjs(defaultDateTime).format('mm') : dayjs().add(1, 'hour').minute(0).format('mm') // Start with minute 0 for next hour
  );

  const handleConfirm = () => {
    if (selectedDate) {
      const finalDateTime = dayjs(selectedDate)
        .hour(parseInt(selectedHour, 10))
        .minute(parseInt(selectedMinute, 10))
        .second(0)
        .millisecond(0);

      if (finalDateTime.isBefore(dayjs())) {
        alert('Scheduled time cannot be in the past.'); // Consider a non-blocking notification
        return;
      }
      onConfirmSchedule(finalDateTime.toDate());
      onClose(); // Ensure parent state is updated to close the modal
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 / 5 }, (_, i) => (i * 5).toString().padStart(2, '0')); // Every 5 minutes

  // Update selected time if selectedDate changes to ensure it's not in the past
  React.useEffect(() => {
    if (selectedDate) {
      const now = dayjs();
      let currentSelectedDateTime = dayjs(selectedDate)
        .hour(parseInt(selectedHour, 10))
        .minute(parseInt(selectedMinute, 10));

      if (currentSelectedDateTime.isBefore(now)) {
        const nextValidTime = now.add(5 - (now.minute() % 5), 'minute'); // next 5 min interval
        if (dayjs(selectedDate).isSame(now, 'day')) {
            setSelectedHour(nextValidTime.format('HH'));
            setSelectedMinute(nextValidTime.format('mm'));
        } else if (dayjs(selectedDate).isBefore(now, 'day')) {
            // This case should be prevented by calendar's disabled prop, but as a fallback:
            setSelectedDate(now.toDate());
            setSelectedHour(nextValidTime.format('HH'));
            setSelectedMinute(nextValidTime.format('mm'));
        }
        // If selectedDate is in the future, time can be anything, no change needed unless past values were stuck
      }
    }
  }, [selectedDate, selectedHour, selectedMinute]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>} 
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Schedule Event Publish</DialogTitle>
          <DialogDescription>
            Select the date and time you want your event to be published.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="schedule-date" className="block mb-1 text-sm font-medium">Publish Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border bg-card text-card-foreground"
              disabled={(date: Date) => dayjs(date).isBefore(dayjs(), 'day')} // Added Date type
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule-hour" className="block mb-1 text-sm font-medium">Publish Hour (24h)</Label>
              <select 
                id="schedule-hour" 
                value={selectedHour} 
                onChange={(e) => setSelectedHour(e.target.value)}
                className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5"
              >
                {hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="schedule-minute" className="block mb-1 text-sm font-medium">Publish Minute</Label>
              <select 
                id="schedule-minute" 
                value={selectedMinute} 
                onChange={(e) => setSelectedMinute(e.target.value)}
                className="mt-1 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5"
              >
                {minutes.map(minute => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between pt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">Confirm Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePublishModal;

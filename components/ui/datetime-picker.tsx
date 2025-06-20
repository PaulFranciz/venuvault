"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  showTimeSelect?: boolean;
  timeFormat?: string;
  dateFormat?: string;
  placeholderText?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  disabled?: boolean;
  timeIntervals?: number;
  showTimeSelectOnly?: boolean;
}

export function DateTimePicker({
  selected,
  onChange,
  showTimeSelect = false,
  timeFormat = "h:mm aa",
  dateFormat = showTimeSelect ? "MMMM d, yyyy h:mm aa" : "MMMM d, yyyy",
  placeholderText,
  minDate,
  maxDate,
  className,
  disabled = false,
  timeIntervals = 15,
  showTimeSelectOnly = false,
}: DateTimePickerProps) {
  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect={showTimeSelect}
        showTimeSelectOnly={showTimeSelectOnly}
        timeFormat={timeFormat}
        timeIntervals={timeIntervals}
        dateFormat={dateFormat}
        placeholderText={placeholderText}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        calendarClassName="!font-sans"
        popperClassName="!z-50"
        popperModifiers={[
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
            },
          },
        ]}
      />
      {!showTimeSelectOnly && (
        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      )}
      {(showTimeSelect || showTimeSelectOnly) && (
        <ClockIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      )}
    </div>
  );
}

// Separate component for time-only selection
export function TimePicker({
  selected,
  onChange,
  placeholderText = "Select time",
  className,
  disabled = false,
  timeIntervals = 15,
}: Omit<DateTimePickerProps, 'showTimeSelect' | 'showTimeSelectOnly'>) {
  return (
    <DateTimePicker
      selected={selected}
      onChange={onChange}
      showTimeSelect={true}
      showTimeSelectOnly={true}
      placeholderText={placeholderText}
      className={className}
      disabled={disabled}
      timeIntervals={timeIntervals}
      dateFormat="h:mm aa"
    />
  );
} 
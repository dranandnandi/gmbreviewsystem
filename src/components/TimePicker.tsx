import React from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // 24-hour format like "07:15"
  onChange: (value: string) => void;
  minTime?: string; // 24-hour format like "06:00"
  maxTime?: string; // 24-hour format like "20:00"
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function TimePicker({
  value,
  onChange,
  minTime = "06:00",
  maxTime = "20:00",
  className = "",
  disabled = false,
  required = false
}: TimePickerProps) {
  // Generate time slots in 15-minute intervals
  const generateTimeSlots = () => {
    const slots: { value: string; label: string }[] = [];
    
    // Parse min and max times
    const [minHour, minMinute] = minTime.split(':').map(Number);
    const [maxHour, maxMinute] = maxTime.split(':').map(Number);
    
    const startMinutes = minHour * 60 + minMinute;
    const endMinutes = maxHour * 60 + maxMinute;
    
    // Generate slots every 15 minutes
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      
      // 24-hour format for value (used in form submission)
      const value24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // 12-hour format for display
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
      
      slots.push({ value: value24, label });
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Convert 24-hour value to 12-hour display format for showing selected value
  const getDisplayValue = (value24: string) => {
    if (!value24) return '';
    
    const [hour, minute] = value24.split(':').map(Number);
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    
    return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Clock className="h-4 w-4 text-gray-400" />
      </div>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`
          pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm 
          focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-sm bg-white
          ${className}
        `}
      >
        <option value="" disabled>
          Select time
        </option>
        {timeSlots.map((slot) => (
          <option key={slot.value} value={slot.value}>
            {slot.label}
          </option>
        ))}
      </select>
    </div>
  );
}
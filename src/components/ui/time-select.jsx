"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const hour12 = hours % 12 || 12;
  const period = hours < 12 ? "AM" : "PM";
  return {
    value,
    label: `${hour12}:${String(minutes).padStart(2, "0")} ${period}`,
  };
});

export function TimeSelect({ value, onChange, placeholder = "Select time", id }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

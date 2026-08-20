"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);
  const selectedRef = useRef(null);
  const selectedOption = TIME_OPTIONS.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      const selected = selectedRef.current;
      if (!list || !selected) return;
      list.scrollTop = selected.offsetTop - (list.clientHeight - selected.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const scroll = (direction) => {
    listRef.current?.scrollBy({ top: direction * 160, behavior: "smooth" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>{selectedOption?.label || placeholder}</span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-full"
          onClick={() => scroll(-1)}
          aria-label="Show earlier times"
        >
          <ChevronUp className="size-4" />
        </Button>
        <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain py-1">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              ref={option.value === value ? selectedRef : null}
              type="button"
              className={cn(
                "relative flex w-full items-center rounded-sm py-1.5 pr-8 pl-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                option.value === value && "bg-accent/60"
              )}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {option.value === value && <Check className="absolute right-2 size-4" />}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-full"
          onClick={() => scroll(1)}
          aria-label="Show later times"
        >
          <ChevronDown className="size-4" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}

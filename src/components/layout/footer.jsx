"use client";

import Link from "next/link";
import { Heart, LifeBuoy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} Wings of Angel Aviation</span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1">
              Design & Developed with <Heart className="h-3 w-3 fill-red-500 text-red-500" /> by{" "}
              <a 
                href="https://usdesignhub.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                US Design Hub
              </a>
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/support" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
              <LifeBuoy className="h-3.5 w-3.5" />
              Support
            </Link>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

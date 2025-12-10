'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plane, LogIn, LogOut } from 'lucide-react';

export function CheckoutModal({ isOpen, onClose, onSubmit, aircraft, action, lastLog }) {
  const [hobbs, setHobbs] = useState('');
  const [tach, setTach] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Pre-fill with last logged values
    if (lastLog && isOpen) {
      setHobbs(lastLog.hobbs?.toString() || '');
      setTach(lastLog.tach?.toString() || '');
    }
  }, [lastLog, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ hobbs: parseFloat(hobbs), tach: parseFloat(tach) });
      setHobbs('');
      setTach('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckout = action === 'checkout';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCheckout ? (
              <>
                <LogOut className="h-5 w-5 text-blue-600" />
                Check Out Aircraft
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 text-green-600" />
                Check In Aircraft
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {aircraft?.tail_number} • {aircraft?.make} {aircraft?.model}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lastLog && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="text-sm font-medium">Last Recorded</div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div>Hobbs: {lastLog.hobbs?.toFixed(1)}</div>
                <div>Tach: {lastLog.tach?.toFixed(1)}</div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="hobbs">Hobbs Time *</Label>
            <Input
              id="hobbs"
              type="number"
              step="0.1"
              min={lastLog?.hobbs || 0}
              value={hobbs}
              onChange={(e) => setHobbs(e.target.value)}
              placeholder="e.g., 1234.5"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current Hobbs meter reading (hours)
            </p>
          </div>

          <div>
            <Label htmlFor="tach">Tach Time *</Label>
            <Input
              id="tach"
              type="number"
              step="0.1"
              min={lastLog?.tach || 0}
              value={tach}
              onChange={(e) => setTach(e.target.value)}
              placeholder="e.g., 1200.2"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current Tachometer reading (hours)
            </p>
          </div>

          {lastLog && (
            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> Values must be equal to or greater than last recorded
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : isCheckout ? 'Check Out' : 'Check In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


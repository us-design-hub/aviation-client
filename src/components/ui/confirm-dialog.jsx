"use client"

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle, 
  Info, 
  XCircle,
  HelpCircle
} from 'lucide-react';

const iconMap = {
  warning: AlertTriangle,
  danger: Trash2,
  success: CheckCircle,
  info: Info,
  error: XCircle,
  question: HelpCircle,
};

const colorMap = {
  warning: 'text-orange-500',
  danger: 'text-red-500',
  success: 'text-green-500',
  info: 'text-blue-500',
  error: 'text-red-500',
  question: 'text-blue-500',
};

const bgColorMap = {
  warning: 'bg-orange-100 dark:bg-orange-900/20',
  danger: 'bg-red-100 dark:bg-red-900/20',
  success: 'bg-green-100 dark:bg-green-900/20',
  info: 'bg-blue-100 dark:bg-blue-900/20',
  error: 'bg-red-100 dark:bg-red-900/20',
  question: 'bg-blue-100 dark:bg-blue-900/20',
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'question',
  onConfirm,
  onCancel,
  loading = false,
  destructive = false
}) {
  const IconComponent = iconMap[type];
  const iconColor = colorMap[type];
  const bgColor = bgColorMap[type];

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-full ${bgColor}`}>
              <IconComponent className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex space-x-2 pt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            {destructive ? (
              <Button 
                variant="destructive" 
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            ) : (
              <GoldenButton 
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </GoldenButton>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easy usage
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'question',
    onConfirm: null,
    onCancel: null,
    loading: false,
    destructive: false,
  });

  const showConfirm = ({
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'question',
    destructive = false,
    onConfirm,
    onCancel,
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title,
        description,
        confirmText,
        cancelText,
        type,
        destructive,
        loading: false,
        onConfirm: async () => {
          setDialogState(prev => ({ ...prev, loading: true }));
          try {
            if (onConfirm) {
              await onConfirm();
            }
            resolve(true);
          } catch (error) {
            console.error('Confirm action failed:', error);
            resolve(false);
          } finally {
            setDialogState(prev => ({ ...prev, open: false, loading: false }));
          }
        },
        onCancel: () => {
          if (onCancel) {
            onCancel();
          }
          resolve(false);
          setDialogState(prev => ({ ...prev, open: false }));
        },
      });
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };

  return {
    showConfirm,
    closeDialog,
    ConfirmDialog: (
      <ConfirmDialog
        {...dialogState}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(prev => ({ ...prev, open: false }));
          }
        }}
      />
    ),
  };
}

// Preset configurations for common actions
export const confirmPresets = {
  delete: (itemName) => ({
    title: 'Delete Confirmation',
    description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
    destructive: true,
  }),
  
  save: () => ({
    title: 'Save Changes',
    description: 'Are you sure you want to save these changes?',
    confirmText: 'Save',
    cancelText: 'Cancel',
    type: 'question',
    destructive: false,
  }),
  
  discard: () => ({
    title: 'Discard Changes',
    description: 'You have unsaved changes. Are you sure you want to discard them?',
    confirmText: 'Discard',
    cancelText: 'Keep Editing',
    type: 'warning',
    destructive: true,
  }),
  
  logout: () => ({
    title: 'Sign Out',
    description: 'Are you sure you want to sign out of your account?',
    confirmText: 'Sign Out',
    cancelText: 'Cancel',
    type: 'question',
    destructive: false,
  }),
  
  archive: (itemName) => ({
    title: 'Archive Item',
    description: `Are you sure you want to archive "${itemName}"? It will be moved to the archive.`,
    confirmText: 'Archive',
    cancelText: 'Cancel',
    type: 'warning',
    destructive: false,
  }),
};

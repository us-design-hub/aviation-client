"use client"

// Example usage of the ConfirmDialog component
import { useConfirmDialog, confirmPresets } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { GoldenButton } from '@/components/ui/golden-button';
import { toast } from 'sonner';

export function ConfirmDialogExamples() {
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  // Example 1: Delete confirmation with preset
  const handleDelete = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.delete('Test Item'),
      onConfirm: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Item deleted successfully');
      }
    });
  };

  // Example 2: Custom confirmation
  const handleCustomAction = async () => {
    const confirmed = await showConfirm({
      title: 'Custom Action',
      description: 'This is a custom confirmation dialog with your own settings.',
      confirmText: 'Do It',
      cancelText: 'Maybe Later',
      type: 'info',
      destructive: false,
      onConfirm: async () => {
        toast.success('Custom action completed');
      }
    });
  };

  // Example 3: Save changes confirmation
  const handleSaveChanges = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.save(),
      onConfirm: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Changes saved successfully');
      }
    });
  };

  // Example 4: Logout confirmation
  const handleLogout = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.logout(),
      onConfirm: async () => {
        toast.success('Signed out successfully');
      }
    });
  };

  // Example 5: Archive confirmation
  const handleArchive = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.archive('Important Document'),
      onConfirm: async () => {
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Document archived successfully');
      }
    });
  };

  // Example 6: Warning confirmation
  const handleWarningAction = async () => {
    const confirmed = await showConfirm({
      title: 'Potential Data Loss',
      description: 'This action might cause data loss. Please make sure you have a backup before proceeding.',
      confirmText: 'Continue Anyway',
      cancelText: 'Cancel',
      type: 'warning',
      destructive: true,
      onConfirm: async () => {
        toast.success('Action completed with warning');
      }
    });
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Confirmation Dialog Examples</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Button variant="destructive" onClick={handleDelete}>
          Delete Item
        </Button>
        
        <GoldenButton onClick={handleCustomAction}>
          Custom Dialog
        </GoldenButton>
        
        <Button variant="outline" onClick={handleSaveChanges}>
          Save Changes
        </Button>
        
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
        
        <Button variant="outline" onClick={handleArchive}>
          Archive Item
        </Button>
        
        <Button variant="outline" onClick={handleWarningAction}>
          Warning Action
        </Button>
      </div>

      {/* This renders the confirmation dialog */}
      {ConfirmDialog}
    </div>
  );
}

// Usage in other components:
/*
import { useConfirmDialog, confirmPresets } from '@/components/ui/confirm-dialog';

function MyComponent() {
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  const handleSomeAction = async () => {
    const confirmed = await showConfirm({
      ...confirmPresets.delete('User Account'),
      onConfirm: async () => {
        // Your delete logic here
        await deleteUser();
        toast.success('User deleted');
      }
    });
  };

  return (
    <div>
      <Button onClick={handleSomeAction}>Delete User</Button>
      {ConfirmDialog}
    </div>
  );
}
*/

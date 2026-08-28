import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AlertTriangle } from 'lucide-react';

interface DeleteCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onConfirm: (confirm: string) => void;
  loading?: boolean;
}

/** A stronger gate than ConfirmDeleteDialog's single click — this erases an
 *  entire company's data (every project, task, message, file...), not one
 *  record, so it asks the admin to type the company's own name back. */
export function DeleteCompanyDialog({ open, onOpenChange, companyName, onConfirm, loading }: DeleteCompanyDialogProps) {
  const [value, setValue] = useState('');
  const matches = value.trim() === companyName;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValue('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-100">
            <AlertTriangle className="h-6 w-6 text-terracotta-600" />
          </div>
          <DialogTitle className="text-center">Delete {companyName}</DialogTitle>
          <DialogDescription className="text-center">
            This permanently erases every project, task, file, message, invoice, and
            employee/client record for this company. There is no undo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-company-name">
            Type <span className="font-semibold text-ink-900">{companyName}</span> to confirm
          </Label>
          <Input
            id="confirm-company-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>

        <DialogFooter className="sm:justify-center gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(value.trim())} disabled={!matches || loading}>
            {loading ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

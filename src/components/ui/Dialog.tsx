import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const reduce = !!useReducedMotion();
  return (
    <DialogPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn('fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={motionTransition(reduce, springs.snappy)}
      />
    </DialogPrimitive.Overlay>
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { overlayClassName?: string }
>(({ className, overlayClassName, children, ...props }, ref) => {
  const reduce = !!useReducedMotion();
  // Centering is folded into the motion transform itself (x/y as percentage
  // strings) rather than a `-translate-x-1/2 -translate-y-1/2` class — once an
  // element has framer-motion `animate`/`initial` values, framer owns the
  // whole `transform` string every frame, so a class-based transform would be
  // silently clobbered rather than composed with it.
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content ref={ref} asChild {...props}>
        <motion.div
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg max-h-[85vh] gap-4 overflow-y-auto border border-ink-200 bg-bone-50 p-4 shadow-lg rounded-md sm:p-6',
            className
          )}
          initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          transition={motionTransition(reduce, springs.snappy)}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brass-500 sm:right-4 sm:top-4">
            <X className="h-4 w-4 text-ink-600" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-ink-900', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-ink-500', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};

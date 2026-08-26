import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Check, Mail } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const contactSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10, 'Say a little more — at least 10 characters'),
});
type ContactForm = z.infer<typeof contactSchema>;

export function ContactSection() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  const submit = useMutation({
    mutationFn: (data: ContactForm) => api.post('/contact', data),
    onSuccess: () => {
      setSent(true);
      reset();
    },
    meta: { suppressErrorToast: true },
  });

  return (
    <section id="contact" className="border-t border-ink-200 px-6 py-24">
      {/* Deliberately still. After six animated sections, the calm is what
          marks this out as the place to act. */}
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:border-r lg:border-ink-200 lg:pr-16">
          <span className="block h-0.5 w-6 bg-brass-500" />
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
            Questions? Reach out.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-600">
            We read every message and reply directly. Tell us about your studio and what you are
            using today.
          </p>
        </div>

        <div className="w-full">

        {sent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-moss-400/40 bg-moss-100 px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-600 text-bone-50">
              <Check size={18} />
            </span>
            <p className="font-display text-lg font-medium text-ink-900">Message sent</p>
            <p className="text-sm text-ink-600">Thanks for reaching out — we'll get back to you soon.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) => submit.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" placeholder="Your name" {...register('name')} />
              {errors.name && <p className="text-xs text-terracotta-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="you@studio.com" {...register('email')} />
              {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" rows={5} placeholder="How can we help?" {...register('message')} />
              {errors.message && <p className="text-xs text-terracotta-600">{errors.message.message}</p>}
            </div>

            {submit.isError && (
              <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{getErrorMessage(submit.error)}</span>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submit.isPending}>
              <Mail size={16} />
              {submit.isPending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        )}
        </div>
      </div>
    </section>
  );
}

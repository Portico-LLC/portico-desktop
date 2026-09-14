import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, cleanPayload, getErrorMessage } from '@/lib/api';
import { isElectron } from '@/lib/isElectron';
import type { Lead } from '@/lib/types';
import type { LeadsJob, LeadsScrapedRow } from '@/types/electron';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { MapPin, Search, UserPlus } from 'lucide-react';

const searchSchema = z.object({
  keywords: z.string().min(1, 'Enter at least one search line'),
  lang: z.string().min(2).max(2),
  depth: z.number().int().min(1).max(20),
  maxTimeMinutes: z.number().int().min(3).max(30),
  email: z.boolean(),
});
type SearchForm = z.infer<typeof searchSchema>;

const JOB_STATUS_META: Record<LeadsJob['Status'], { label: string; variant: 'neutral' | 'ochre' | 'moss' | 'terracotta' }> = {
  pending: { label: 'Queued', variant: 'neutral' },
  working: { label: 'Scraping…', variant: 'ochre' },
  ok: { label: 'Done', variant: 'moss' },
  failed: { label: 'Failed', variant: 'terracotta' },
};

const ACTIVE_JOB_STATUSES: LeadsJob['Status'][] = ['pending', 'working'];

/** Maps a row of the scraper's CSV (raw column names — see upstream
 *  gosom/google-maps-scraper's "Extracted Data Points" docs) onto Portico's own
 *  `/leads/import` shape. */
function rowToImportPayload(row: LeadsScrapedRow) {
  const num = (v?: string) => (v && v.trim() !== '' ? Number(v) : undefined);
  return cleanPayload({
    name: row.title || row.name,
    category: row.category,
    address: row.complete_address || row.address,
    phone: row.phone,
    website: row.website,
    email: row.emails,
    rating: num(row.review_rating),
    reviewCount: num(row.review_count),
    sourceUrl: row.link,
    placeId: row.place_id,
    cid: row.cid,
    source: 'google_maps',
  }) as Record<string, unknown>;
}

function readyReasonMessage(reason?: string, message?: string): string {
  switch (reason) {
    case 'unsupported-platform':
      return 'The Leads scraper is only available on Windows for now.';
    case 'binary-missing':
      return 'The Leads scraper component is missing from this install.';
    case 'install-failed':
      return `Setting up the local scraper failed${message ? `: ${message}` : '.'}`;
    case 'start-timeout':
      return 'The local scraper did not start in time. Try again.';
    default:
      return 'Could not start the local scraper.';
  }
}

export function Leads() {
  if (!isElectron) return <Navigate to="/" replace />;
  return <LeadsPage />;
}

function LeadsPage() {
  const leadsBridge = window.portico!.leads;
  const queryClient = useQueryClient();
  const [readyState, setReadyState] = useState<'idle' | 'installing' | 'starting' | 'ready' | 'error'>('idle');
  const [readyError, setReadyError] = useState<string | null>(null);
  const handledJobIds = useRef<Set<string>>(new Set());

  const { data: availability } = useQuery({
    queryKey: ['leads-scraper-availability'],
    queryFn: () => leadsBridge.getStatus(),
  });

  useEffect(() => leadsBridge.onInstallProgress((progress) => setReadyState(progress.phase)), [leadsBridge]);

  const { data: jobs = [] } = useQuery({
    queryKey: ['leads-scrape-jobs'],
    queryFn: () => leadsBridge.listJobs(),
    enabled: readyState === 'ready',
    refetchInterval: (query) => (query.state.data?.some((j) => ACTIVE_JOB_STATUSES.includes(j.Status)) ? 2000 : false),
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get<Lead[]>('/leads').then((r) => r.data),
  });

  const importMutation = useMutation({
    mutationFn: (rows: LeadsScrapedRow[]) =>
      api.post('/leads/import', { leads: rows.map(rowToImportPayload) }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  // Import results from any job that just finished — each job id is only handled once per session.
  useEffect(() => {
    for (const job of jobs) {
      if (job.Status === 'ok' && !handledJobIds.current.has(job.ID)) {
        handledJobIds.current.add(job.ID);
        leadsBridge
          .downloadJob(job.ID)
          .then((rows) => {
            if (rows.length > 0) importMutation.mutate(rows);
          })
          .catch((err) => console.error('Failed to download scrape results', err));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const createJobMutation = useMutation({
    mutationFn: async (data: SearchForm) => {
      setReadyError(null);
      const result = await leadsBridge.ensureReady();
      if (!result.ok) throw new Error(readyReasonMessage(result.reason, result.message));
      setReadyState('ready');
      const keywords = data.keywords
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);
      return leadsBridge.createJob({
        keywords,
        lang: data.lang,
        zoom: 15,
        lat: '0',
        lon: '0',
        fast_mode: false,
        radius: 10000,
        depth: data.depth,
        email: data.email,
        extra_reviews: false,
        max_time: data.maxTimeMinutes * 60,
        proxies: [],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads-scrape-jobs'] }),
    onError: (err) => setReadyError(getErrorMessage(err)),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert-to-client`, {}).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: { keywords: '', lang: 'en', depth: 10, maxTimeMinutes: 3, email: false },
  });

  const unavailable = availability && !availability.available;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Leads</h1>
        <p className="text-ink-500">
          Find business leads from Google Maps, scraped locally on this machine — no paid API, no cloud service.
        </p>
      </div>

      {unavailable && (
        <Card className="mb-6 border-terracotta-300 bg-terracotta-50">
          <CardContent className="py-4 text-sm text-terracotta-700">
            {availability.reason === 'unsupported-platform'
              ? 'The Leads scraper is only available in the Windows build of Portico for now.'
              : 'The Leads scraper component is missing from this install. Reinstall Portico to enable it.'}
          </CardContent>
        </Card>
      )}

      {!unavailable && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin size={16} /> New Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => createJobMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keywords">Search queries</Label>
                <Textarea id="keywords" placeholder={'dentists in Berlin\ncoffee shops in Austin, TX'} rows={3} {...register('keywords')} />
                <p className="text-xs text-ink-400">One search per line — business type and location, like the examples above.</p>
                {errors.keywords && <p className="text-xs text-terracotta-600">{errors.keywords.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lang">Language</Label>
                  <Select id="lang" {...register('lang')}>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                    <option value="ar">Arabic</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depth">Results per search</Label>
                  <Select id="depth" {...register('depth', { valueAsNumber: true })}>
                    <option value="1">Quick (~1 page)</option>
                    <option value="5">Standard</option>
                    <option value="10">Thorough</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTimeMinutes">Max run time</Label>
                  <Select id="maxTimeMinutes" {...register('maxTimeMinutes', { valueAsNumber: true })}>
                    <option value="3">3 minutes</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Controller control={control} name="email" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                <div>
                  <Label>Also look up emails</Label>
                  <p className="text-xs text-ink-400">Visits each business's website — slower, but fills in an email when one is public.</p>
                </div>
              </div>

              {readyState === 'installing' && <p className="text-xs text-ink-500">Setting up the local scraper (one-time, ~300MB download)…</p>}
              {readyState === 'starting' && <p className="text-xs text-ink-500">Starting the local scraper…</p>}
              {readyError && <p className="text-xs text-terracotta-600">{readyError}</p>}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-ink-400">Scrapes Google Maps directly — this may violate Google's Terms of Service. Use responsibly.</p>
                <Button type="submit" variant="primary" disabled={createJobMutation.isPending}>
                  <Search size={16} />
                  {createJobMutation.isPending ? 'Starting…' : 'Search'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Recent searches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-ink-200">
              {jobs.map((job) => {
                const meta = JOB_STATUS_META[job.Status];
                return (
                  <div key={job.ID} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{job.Data.keywords.join(', ')}</p>
                      <p className="text-xs text-ink-400">{new Date(job.Date).toLocaleString()}</p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leadsLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">No leads yet. Run a search above.</div>
          ) : (
            <div className="divide-y divide-ink-200">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 transition-colors hover:bg-ink-50">
                  <div className="flex items-center gap-4">
                    <Avatar name={lead.name} />
                    <div>
                      <p className="font-medium text-ink-900">{lead.name}</p>
                      {lead.category && <p className="text-sm text-ink-400">{lead.category}</p>}
                      {(lead.phone || lead.email) && <p className="text-xs text-ink-400">{[lead.phone, lead.email].filter(Boolean).join(' · ')}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lead.status === 'converted' ? 'moss' : lead.status === 'discarded' ? 'terracotta' : 'neutral'}>
                      {lead.status || 'new'}
                    </Badge>
                    {lead.status !== 'converted' && (
                      <Button variant="secondary" size="sm" onClick={() => convertMutation.mutate(lead.id)} disabled={convertMutation.isPending}>
                        <UserPlus size={14} />
                        Convert to Client
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

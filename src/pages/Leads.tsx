import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, cleanPayload, getErrorMessage } from '@/lib/api';
import { isElectron } from '@/lib/isElectron';
import type { Lead } from '@/lib/types';
import type { LeadsJob, LeadsScrapedRow } from '@/types/electron';
import { resolveLeadsAnchor, widenLeadsAnchor } from '@/lib/leadsLocation';
import type { LeadsLocationSelection } from '@/lib/leadsLocation';
import { LocationPicker } from '@/components/leads/LocationPicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { MapPin, Search, UserPlus, ChevronDown, Clock, FileText, ExternalLink } from 'lucide-react';

const searchSchema = z.object({
  keywords: z.string().min(1, 'Enter at least one business type'),
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

type ImportStatus =
  | { state: 'importing' }
  | { state: 'retrying' }
  | { state: 'imported'; count: number }
  | { state: 'no-results' }
  | { state: 'failed'; error: string };

/** Maps a row of the scraper's CSV (raw column names — see upstream
 *  gosom/google-maps-scraper's "Extracted Data Points" docs) onto Portico's own
 *  `/leads/import` shape. `fallbackCategory` is the keyword that was searched
 *  for — fast mode's own `category` column comes back empty, so the search
 *  term itself is the best category info available without it. */
function rowToImportPayload(row: LeadsScrapedRow, fallbackCategory?: string) {
  const num = (v?: string) => (v && v.trim() !== '' ? Number(v) : undefined);
  // The scraper's `emails` column is a comma-joined list when a business has
  // more than one address on file (Go's `strings.Join(emails, ", ")`) — only
  // the first is usable as a single Lead.email value.
  const firstEmail = row.emails?.split(',')[0]?.trim();
  // `open_hours` is a JSON object serialized into one CSV cell (e.g.
  // {"Monday":["6:30 AM–9 PM"]}) — parse it back into a real object for the
  // jsonb column, or drop it if it's missing/malformed rather than storing
  // the literal string "null" the scraper writes for no data.
  let openingHours: Record<string, string[]> | undefined;
  try {
    const parsed = row.open_hours ? JSON.parse(row.open_hours) : null;
    if (parsed && typeof parsed === 'object') openingHours = parsed;
  } catch {
    // Malformed/absent — leave undefined.
  }
  return cleanPayload({
    name: row.title || row.name,
    category: row.category || fallbackCategory,
    // `complete_address` is a JSON-serialized struct on the scraper's side, not
    // a display string — `address` is the plain human-readable one.
    address: row.address || row.complete_address,
    phone: row.phone,
    website: row.website,
    email: firstEmail,
    rating: num(row.review_rating),
    reviewCount: num(row.review_count),
    sourceUrl: row.link,
    placeId: row.place_id,
    cid: row.cid,
    source: 'google_maps',
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    openingHours,
    // Best-effort only — fast mode's own `about`/`descriptions` columns come
    // back empty; `description` here is a website meta-description the
    // scraper wrapper adds itself when email lookup is on (see
    // leads-scraper.cjs's enrichWithDescriptions), not Google's own text.
    description: row.description,
  }) as Record<string, unknown>;
}

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** `lead.openingHours` is `{"Monday":["6:30 AM–9 PM"], ...}` — one line per
 *  weekday present, in week order regardless of the order the API returned. */
function formatOpeningHours(hours: Record<string, string[]>): { day: string; text: string }[] {
  return WEEKDAY_ORDER.filter((day) => hours[day]?.length).map((day) => ({ day, text: hours[day].join(', ') }));
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

interface LeadsErrorBoundaryState {
  error: Error | null;
}

/** Catches a render-time throw anywhere in the Leads page — a bad response
 *  shape from the local scraper's API being the most likely cause — and shows
 *  a recoverable message instead of silently blanking the whole app. */
class LeadsErrorBoundary extends Component<{ children: ReactNode }, LeadsErrorBoundaryState> {
  state: LeadsErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error('Leads page crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <Card className="border-terracotta-300 bg-terracotta-50">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-terracotta-700">Something went wrong on the Leads page.</p>
              <p className="mt-1 text-xs text-terracotta-600">{this.state.error.message}</p>
              <Button className="mt-4" variant="secondary" size="sm" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Leads() {
  if (!isElectron) return <Navigate to="/" replace />;
  return (
    <LeadsErrorBoundary>
      <LeadsPage />
    </LeadsErrorBoundary>
  );
}

function LeadsPage() {
  const leadsBridge = window.portico!.leads;
  const queryClient = useQueryClient();
  const [readyState, setReadyState] = useState<'idle' | 'installing' | 'starting' | 'ready' | 'error'>('idle');
  const [readyError, setReadyError] = useState<string | null>(null);
  const [location, setLocation] = useState<LeadsLocationSelection | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const handledJobIds = useRef<Set<string>>(new Set());
  // Jobs that have already used their one zero-result retry — checked both for
  // a job about to be retried and pre-marked for the retry job itself, so a
  // retry's retry never fires.
  const retriedJobIds = useRef<Set<string>>(new Set());

  const { data: availability } = useQuery({
    queryKey: ['leads-scraper-availability'],
    queryFn: () => leadsBridge.getStatus(),
  });

  useEffect(() => leadsBridge.onInstallProgress((progress) => setReadyState(progress.phase)), [leadsBridge]);

  const { data: jobsData } = useQuery({
    queryKey: ['leads-scrape-jobs'],
    // Belt-and-suspenders: leadsBridge.listJobs() already normalizes a bare
    // `null` response (the scraper's API returns that instead of `[]` when no
    // jobs exist yet) to `[]`, but never trust an external process's response
    // shape twice removed from where it was fetched.
    queryFn: () => leadsBridge.listJobs().then((data) => data ?? []),
    enabled: readyState === 'ready',
    refetchInterval: (query) => (query.state.data?.some((j) => ACTIVE_JOB_STATUSES.includes(j.Status)) ? 2000 : false),
  });
  const jobs = jobsData ?? [];

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get<Lead[]>('/leads').then((r) => r.data),
  });

  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});

  // Import results from any job that just finished — each job id is only handled once per session.
  // Tracked per-job (not a shared mutation) so a failure on one search is visible
  // right next to it instead of silently doing nothing.
  useEffect(() => {
    for (const job of jobs) {
      if (job.Status !== 'ok' || handledJobIds.current.has(job.ID)) continue;
      handledJobIds.current.add(job.ID);
      setImportStatus((s) => ({ ...s, [job.ID]: { state: 'importing' } }));

      leadsBridge
        .downloadJob(job.ID)
        .then(async (rows) => {
          if (rows.length === 0) {
            // One safety-net retry with a wider radius before giving up —
            // covers a genuinely sparse area (a small town with few of
            // whatever was searched) without failing on the very first try.
            if (!retriedJobIds.current.has(job.ID)) {
              retriedJobIds.current.add(job.ID);
              try {
                const widened = widenLeadsAnchor({
                  lat: job.Data.lat,
                  lon: job.Data.lon,
                  radius: job.Data.radius,
                  resolvedCityName: '',
                });
                const retryJob = await leadsBridge.createJob({
                  ...job.Data,
                  name: `${job.Name} (wider search)`,
                  radius: widened.radius,
                });
                retriedJobIds.current.add(retryJob.id);
                setImportStatus((s) => ({ ...s, [job.ID]: { state: 'retrying' } }));
                queryClient.invalidateQueries({ queryKey: ['leads-scrape-jobs'] });
                return;
              } catch (err) {
                console.error('Failed to retry empty search with a wider radius', err);
                // Fall through to reporting no-results below.
              }
            }
            setImportStatus((s) => ({ ...s, [job.ID]: { state: 'no-results' } }));
            return;
          }
          const res = await api.post<{ imported: number; skipped: number }>('/leads/import', {
            leads: rows.map((row) => rowToImportPayload(row, job.Data.keywords[0])),
          });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          setImportStatus((s) => ({ ...s, [job.ID]: { state: 'imported', count: res.data.imported } }));
        })
        .catch((err) => {
          console.error('Failed to add scraped leads', err);
          setImportStatus((s) => ({ ...s, [job.ID]: { state: 'failed', error: getErrorMessage(err) } }));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const createJobMutation = useMutation({
    mutationFn: async (data: SearchForm) => {
      setReadyError(null);
      if (!location) throw new Error('Choose a location to search in.');
      const anchor = resolveLeadsAnchor(location);
      if (!anchor) throw new Error("Couldn't resolve that location — try picking a different one.");

      const result = await leadsBridge.ensureReady();
      if (!result.ok) throw new Error(readyReasonMessage(result.reason, result.message));
      setReadyState('ready');

      // The bundled scraper's normal (Playwright/headless-browser) mode has a
      // reproducible upstream bug — every search fails with "unexpected page
      // type" regardless of query or coordinates. Its fast mode (a plain HTTP
      // fetch, no browser) works, but it flatly requires real coordinates —
      // "0,0" or an empty geo returns zero results just like normal mode did.
      // `anchor` never uses a raw region centroid on its own (see
      // resolveLeadsAnchor) — it's always a real, nearby city, which is what
      // makes this reliable regardless of how broad a location is picked.
      const keywords = data.keywords
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);

      await leadsBridge.createJob({
        name: `${keywords.join(', ')} — near ${anchor.resolvedCityName}`,
        keywords,
        lang: data.lang,
        zoom: 13,
        lat: anchor.lat,
        lon: anchor.lon,
        fast_mode: true,
        radius: anchor.radius,
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
              <LocationPicker value={location} onChange={setLocation} />
              <div className="space-y-2">
                <Label htmlFor="keywords">Business types</Label>
                <Textarea id="keywords" placeholder={'dentists\ncoffee shops'} rows={3} {...register('keywords')} />
                <p className="text-xs text-ink-400">One per line — each is searched in the location above.</p>
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
                  <Label>Also look up emails &amp; descriptions</Label>
                  <p className="text-xs text-ink-400">
                    Visits each business's website — slower, but fills in an email and a short description when public.
                  </p>
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
                const imp = importStatus[job.ID];
                return (
                  <div key={job.ID} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{job.Name || job.Data.keywords.join(', ')}</p>
                      <p className="text-xs text-ink-400">{new Date(job.Date).toLocaleString()}</p>
                      {imp?.state === 'importing' && <p className="text-xs text-ink-400">Adding leads…</p>}
                      {imp?.state === 'retrying' && <p className="text-xs text-ink-400">No results — trying a wider search…</p>}
                      {imp?.state === 'imported' && (
                        <p className="text-xs text-moss-600">
                          {imp.count} lead{imp.count === 1 ? '' : 's'} added
                        </p>
                      )}
                      {imp?.state === 'no-results' && <p className="text-xs text-ink-400">No results found, even after widening the search.</p>}
                      {imp?.state === 'failed' && <p className="text-xs text-terracotta-600">Couldn't add leads: {imp.error}</p>}
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
              {leads.map((lead) => {
                const expanded = expandedLeadId === lead.id;
                const hours = lead.openingHours ? formatOpeningHours(lead.openingHours) : [];
                const mapUrl =
                  lead.latitude != null && lead.longitude != null
                    ? `https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`
                    : lead.sourceUrl;
                return (
                  <div key={lead.id} className="transition-colors hover:bg-ink-50">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      onClick={() => setExpandedLeadId(expanded ? null : lead.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar name={lead.name} />
                        <div>
                          <p className="font-medium text-ink-900">{lead.name}</p>
                          {lead.category && <p className="text-sm text-ink-400">{lead.category}</p>}
                          {(lead.phone || lead.email) && (
                            <p className="text-xs text-ink-400">{[lead.phone, lead.email].filter(Boolean).join(' · ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={lead.status === 'converted' ? 'moss' : lead.status === 'discarded' ? 'terracotta' : 'neutral'}>
                          {lead.status || 'new'}
                        </Badge>
                        <ChevronDown size={16} className={`text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {expanded && (
                      <div className="space-y-3 px-4 pb-4 pl-[4.25rem]">
                        {lead.address && <p className="text-sm text-ink-600">{lead.address}</p>}

                        {lead.description && (
                          <p className="flex items-start gap-2 text-sm text-ink-600">
                            <FileText size={14} className="mt-0.5 flex-shrink-0 text-ink-400" />
                            {lead.description}
                          </p>
                        )}

                        {hours.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-ink-600">
                            <Clock size={14} className="mt-0.5 flex-shrink-0 text-ink-400" />
                            <div>
                              {hours.map((h) => (
                                <p key={h.day}>
                                  <span className="text-ink-400">{h.day}:</span> {h.text}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-brass-700 hover:underline"
                            >
                              <MapPin size={14} /> View on map <ExternalLink size={12} />
                            </a>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-brass-700 hover:underline"
                            >
                              Website <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        <div>
                          {lead.status !== 'converted' && (
                            <Button variant="secondary" size="sm" onClick={() => convertMutation.mutate(lead.id)} disabled={convertMutation.isPending}>
                              <UserPlus size={14} />
                              Convert to Client
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

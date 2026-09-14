import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { City, Country, State } from 'country-state-city';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeadsLocationSelection } from '@/lib/leadsLocation';

interface LocationPickerProps {
  value: LeadsLocationSelection | null;
  onChange: (value: LeadsLocationSelection | null) => void;
}

const itemClass = cn(
  'flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-700 transition-colors',
  'data-[selected=true]:bg-brass-50 data-[selected=true]:text-ink-900',
  'cursor-pointer'
);

type Stage = 'country' | 'state' | 'city' | null;

/** Cap on rendered rows per search keystroke — some countries have thousands
 *  of cities, and cmdk mounts every item it's given rather than virtualizing,
 *  so filtering is done here (not via cmdk's own per-item matching) and only
 *  the top matches are ever rendered. */
const MAX_RESULTS = 60;

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [stage, setStage] = useState<Stage>(null);
  const [search, setSearch] = useState('');

  const country = value ? Country.getAllCountries().find((c) => c.isoCode === value.countryCode) : undefined;

  const states = useMemo(
    () => (value ? State.getStatesOfCountry(value.countryCode).filter((s) => s.latitude && s.longitude) : []),
    [value?.countryCode]
  );
  const state = value?.stateCode ? states.find((s) => s.isoCode === value.stateCode) : undefined;

  const cities = useMemo(() => {
    if (!value) return [];
    const list = value.stateCode
      ? City.getCitiesOfState(value.countryCode, value.stateCode)
      : (City.getCitiesOfCountry(value.countryCode) ?? []);
    return list.filter((c) => c.latitude && c.longitude);
  }, [value?.countryCode, value?.stateCode]);

  const openStage = (next: Stage) => {
    setSearch('');
    setStage(next);
  };

  const countryMatches = useMemo(
    () => Country.getAllCountries().filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, MAX_RESULTS),
    [search]
  );
  const stateMatches = useMemo(
    () => states.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, MAX_RESULTS),
    [states, search]
  );
  const cityMatches = useMemo(
    () => cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, MAX_RESULTS),
    [cities, search]
  );

  const dialogTitle = stage === 'country' ? 'Choose a country' : stage === 'state' ? 'Choose a state' : 'Choose a city';

  return (
    <div className="space-y-2">
      <Label>Location</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => openStage('country')}>
          <MapPin size={14} />
          {country ? `${country.flag} ${country.name}` : 'Choose country'}
        </Button>

        {country && states.length > 0 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => openStage('state')}>
            {state ? state.name : 'Choose state (optional)'}
          </Button>
        )}
        {state && (
          <button
            type="button"
            className="text-ink-400 hover:text-ink-700"
            onClick={() => onChange({ countryCode: value!.countryCode })}
            aria-label="Clear state"
          >
            <X size={14} />
          </button>
        )}

        {country && cities.length > 0 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => openStage('city')}>
            {value?.cityName ? value.cityName : 'Choose city (optional, most precise)'}
          </Button>
        )}
        {value?.cityName && (
          <button
            type="button"
            className="text-ink-400 hover:text-ink-700"
            onClick={() => onChange({ countryCode: value!.countryCode, stateCode: value!.stateCode })}
            aria-label="Clear city"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-ink-400">Only a country is required — a state or city narrows and sharpens the search.</p>

      <Dialog open={stage !== null} onOpenChange={(open) => !open && setStage(null)}>
        <DialogContent className="max-w-md gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
          <Command shouldFilter={false} loop className="flex max-h-[70vh] flex-col overflow-hidden rounded-md">
            <div className="flex items-center gap-2.5 border-b border-ink-200 px-4 py-3">
              <Search size={16} className="flex-shrink-0 text-ink-400" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder={dialogTitle}
                className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
            <Command.List className="flex-1 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-400">No matches.</Command.Empty>

              {stage === 'country' &&
                countryMatches.map((c) => (
                  <Command.Item
                    key={c.isoCode}
                    value={c.isoCode}
                    className={itemClass}
                    onSelect={() => {
                      onChange({ countryCode: c.isoCode });
                      setStage(null);
                    }}
                  >
                    <span>{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </Command.Item>
                ))}

              {stage === 'state' &&
                stateMatches.map((s) => (
                  <Command.Item
                    key={s.isoCode}
                    value={s.isoCode}
                    className={itemClass}
                    onSelect={() => {
                      onChange({ countryCode: value!.countryCode, stateCode: s.isoCode });
                      setStage(null);
                    }}
                  >
                    <span className="truncate">{s.name}</span>
                  </Command.Item>
                ))}

              {stage === 'city' &&
                cityMatches.map((c) => (
                  <Command.Item
                    key={`${c.name}-${c.latitude}-${c.longitude}`}
                    value={c.name}
                    className={itemClass}
                    onSelect={() => {
                      onChange({ countryCode: value!.countryCode, stateCode: value!.stateCode, cityName: c.name });
                      setStage(null);
                    }}
                  >
                    <span className="truncate">{c.name}</span>
                  </Command.Item>
                ))}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}

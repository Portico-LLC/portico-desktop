import { useState } from 'react';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  parseCronToSchedule,
  scheduleToCron,
  DEFAULT_SCHEDULE,
  WEEKDAY_NAMES,
  type ScheduleFrequency,
  type StructuredSchedule,
} from './cronSchedule';

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily 9am', value: '0 9 * * *' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
];

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Picker-first UI for `trigger.cron`'s `cronExpression` — frequency, day(s), and a time/
 *  minute selector, all point-and-click, with the raw expression as a fallback for anything
 *  the picker's grammar can't represent (steps, ranges, a month restriction, …). */
export function ScheduleFields({
  cronExpression,
  onChange,
}: {
  cronExpression: string;
  onChange: (cronExpression: string) => void;
}) {
  const [manualMode, setManualMode] = useState(false);
  const parsed = parseCronToSchedule(cronExpression);
  const schedule = parsed ?? DEFAULT_SCHEDULE;
  const useManual = manualMode || parsed === null;

  const update = (patch: Partial<StructuredSchedule>) => {
    onChange(scheduleToCron({ ...schedule, ...patch }));
  };

  const setFrequency = (frequency: ScheduleFrequency) => {
    setManualMode(false);
    const base: StructuredSchedule = { ...schedule, frequency };
    // Switching into weekly from a state with no days selected (e.g. coming from an
    // unparseable custom expression) needs a starting day, not an empty picker.
    if (frequency === 'weekly' && base.daysOfWeek.length === 0) base.daysOfWeek = [1];
    onChange(scheduleToCron(base));
  };

  const toggleDay = (day: number) => {
    const has = schedule.daysOfWeek.includes(day);
    const days = has ? schedule.daysOfWeek.filter((d) => d !== day) : [...schedule.daysOfWeek, day];
    // An empty day list means "every day" in cron, not "never" — refuse to remove the last one.
    if (days.length === 0) return;
    update({ daysOfWeek: days });
  };

  const timeValue = `${pad2(schedule.hour)}:${pad2(schedule.minute)}`;
  const setTime = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    if (Number.isInteger(h) && Number.isInteger(m)) update({ hour: h, minute: m });
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label>Frequency</Label>
        <Select
          // Select's visible label only syncs from its native DOM value once at mount
          // (see its own comment) — remount via `key` whenever the frequency changes for a
          // reason other than the user picking it here (a preset button, "switch back to the
          // guided picker", loading an existing schedule), or the label goes stale.
          key={useManual ? 'custom' : schedule.frequency}
          value={useManual ? 'custom' : schedule.frequency}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'custom') setManualMode(true);
            else setFrequency(value as ScheduleFrequency);
          }}
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom (cron expression)</option>
        </Select>
      </div>

      {!useManual && schedule.frequency === 'hourly' && (
        <div className="space-y-1.5">
          <Label>Minute past the hour</Label>
          <Select value={String(schedule.minute)} onChange={(e) => update({ minute: Number(e.target.value) })}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                :{pad2(m)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {!useManual && schedule.frequency !== 'hourly' && (
        <div className="space-y-1.5">
          <Label>Time</Label>
          <Input type="time" value={timeValue} onChange={(e) => setTime(e.target.value)} />
        </div>
      )}

      {!useManual && schedule.frequency === 'weekly' && (
        <div className="space-y-1.5">
          <Label>On these days</Label>
          <div className="flex gap-1.5">
            {WEEKDAY_NAMES.map((name, day) => (
              <button
                key={day}
                type="button"
                title={name}
                onClick={() => toggleDay(day)}
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors duration-hover ease-brand',
                  schedule.daysOfWeek.includes(day)
                    ? 'bg-pine-900 text-bone-50'
                    : 'border border-ink-200 bg-bone-50 text-ink-600 hover:bg-ink-100'
                )}
              >
                {name[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {!useManual && schedule.frequency === 'monthly' && (
        <div className="space-y-1.5">
          <Label>Day of month</Label>
          <Select value={String(schedule.dayOfMonth)} onChange={(e) => update({ dayOfMonth: Number(e.target.value) })}>
            {DAYS_OF_MONTH.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      )}

      {useManual && (
        <>
          <div className="space-y-1.5">
            <Label>Cron expression</Label>
            <Input value={cronExpression} onChange={(e) => onChange(e.target.value)} placeholder="0 9 * * *" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CRON_PRESETS.map((p) => (
              <Button
                key={p.value}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onChange(p.value);
                  setManualMode(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {parsed && (
            <button type="button" className="text-xs text-pine-700 underline" onClick={() => setManualMode(false)}>
              Switch back to the guided picker
            </button>
          )}
        </>
      )}

      {!useManual && (
        <button
          type="button"
          className="text-left text-xs text-ink-400 underline hover:text-ink-600"
          onClick={() => setManualMode(true)}
        >
          Edit as raw cron expression
        </button>
      )}
    </>
  );
}

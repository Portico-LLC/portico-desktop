import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { anchorsForAudience, getAnchor, type TourAudience } from '@/lib/onboarding/anchors';
import type { CompanyModule } from '@/lib/types';

/**
 * The "Point at" picker.
 *
 * A curated dropdown rather than a CSS-selector field, deliberately. A studio owner is not
 * going to write a selector, and one they copied out of devtools would break silently the next
 * time a component is refactored — the step would keep claiming to point somewhere while
 * quietly pointing nowhere. Everything offered here is an element the app actually renders, and
 * the list is filtered to what this audience can reach and what this studio has switched on.
 */
export function AnchorSelect({
  value,
  audience,
  enabledModules,
  onChange,
}: {
  value: string | null | undefined;
  audience: TourAudience;
  enabledModules: CompanyModule[] | undefined;
  onChange: (anchorId: string | null) => void;
}) {
  const navigate = useNavigate();
  const options = useMemo(
    () => anchorsForAudience(audience, enabledModules),
    [audience, enabledModules],
  );

  const selected = value ? getAnchor(value) : undefined;
  // A step can outlive the anchor it names — the registry is code, the step is data. Say so
  // rather than silently showing an empty picker.
  const isOrphan = !!value && !selected;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={value ?? ''}
          placeholder="Nothing — show as a card"
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1"
        >
          <option value="">Nothing — show as a card</option>
          {options.map(({ id, anchor }) => (
            <option key={id} value={id}>
              {anchor.group} · {anchor.label}
            </option>
          ))}
        </Select>

        {/* Lets the owner confirm their choice is real by going and looking at it, which is the
            only check that actually proves the anchor resolves. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!selected}
          onClick={() => selected && navigate(selected.route)}
          title={selected ? `Open ${selected.route}` : 'Pick something to point at first'}
        >
          <Crosshair size={14} />
          Find it
        </Button>
      </div>

      {isOrphan && (
        <p className="text-xs text-terracotta-600">
          This step points at something that no longer exists. It will show as a plain card until
          you pick again.
        </p>
      )}
    </div>
  );
}

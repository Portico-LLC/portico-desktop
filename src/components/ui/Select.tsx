import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  ReactElement,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

interface OptionItem {
  value: string;
  label: string;
  disabled: boolean;
}

const collectOptions = (children: ReactNode): OptionItem[] =>
  Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const el = child as ReactElement<{
        value?: string | number | readonly string[];
        disabled?: boolean;
        children?: ReactNode;
      }>;
      const text = el.props.children;
      // Only stringify primitives — an <option> that ends up with a non-primitive
      // child (a caller passing an object instead of a name/id, a broken query
      // result, etc.) should render blank rather than the useless "[object Object]".
      const label = Array.isArray(text)
        ? text.join('')
        : text == null
        ? ''
        : typeof text === 'string' || typeof text === 'number'
        ? String(text)
        : '';
      const rawValue = el.props.value;
      const value =
        rawValue == null
          ? ''
          : typeof rawValue === 'string' || typeof rawValue === 'number' || Array.isArray(rawValue)
          ? String(rawValue)
          : '';
      return {
        value,
        label,
        disabled: Boolean(el.props.disabled),
      };
    });

const Select = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const { className, id, placeholder, ref: registerRef, children, ...rest } =
    props as SelectProps;
  const [open, setOpen] = useState(false);
    const reduce = !!useReducedMotion();
    const [highlight, setHighlight] = useState(-1);
    const [display, setDisplay] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const nativeRef = useRef<HTMLSelectElement | null>(null);

    const options = useMemo(() => collectOptions(children), [children]);

    const assignRef = (el: HTMLSelectElement | null) => {
      nativeRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as MutableRefObject<HTMLSelectElement | null>).current = el;
      if (typeof registerRef === 'function') registerRef(el);
      else if (registerRef)
        (registerRef as MutableRefObject<HTMLSelectElement | null>).current = el;
    };

    // Sync the visible label from the native select's DOM value after the
    // first render. The edit dialogs remount their forms (via `key=`) and
    // react-hook-form sets the native value during registration, so a single
    // pass at mount is enough to keep the label accurate.
    useEffect(() => {
      const value = nativeRef.current?.value ?? '';
      setDisplay((prev) => (prev === value ? prev : value));
    }, []);

    const commit = (item: OptionItem) => {
      const native = nativeRef.current;
      if (native) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        setter?.call(native, item.value);
        native.dispatchEvent(new Event('change', { bubbles: true }));
        native.blur();
      }
      // The value is already correctly applied above (which is why forms submit
      // the right value) — this just keeps the visible trigger label in sync,
      // since nothing else re-reads the native DOM value after mount.
      setDisplay(item.value);
      setOpen(false);
      setHighlight(-1);
    };

    useEffect(() => {
      if (!open) return;
      const onDocMouseDown = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          setOpen(false);
          setHighlight(-1);
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          setHighlight(-1);
        }
      };
      document.addEventListener('mousedown', onDocMouseDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onDocMouseDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [open]);

    const moveHighlight = (step: number) => {
      if (options.length === 0) return;
      setHighlight((h) => {
        const next = h + step;
        if (next < 0) return options.length - 1;
        if (next >= options.length) return 0;
        return next;
      });
    };

    const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(0);
        } else {
          moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = options[highlight];
        if (item && !item.disabled) commit(item);
      }
    };

    const value = display;
    const selectedOption = options.find((o) => o.value === value) ?? null;
    const showPlaceholder = !selectedOption;
    const label = selectedOption ? selectedOption.label : placeholder ?? 'Select…';
    const disabled = rest.disabled;

    return (
      <div ref={rootRef} className={cn('relative', className)}>
        <select
          ref={assignRef}
          id={id}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          {...rest}
        >
          {children}
        </select>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border bg-bone-50/70 px-3 py-2 text-base backdrop-blur-sm transition-all duration-hover ease-brand hover:bg-ink-100/80 hover:shadow-sm active:scale-[0.99] focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-200',
            open
              ? 'border-brass-500 ring-2 ring-brass-200'
              : 'border-ink-300 hover:border-ink-400',
            disabled && 'cursor-not-allowed opacity-50 hover:bg-bone-50/70 hover:shadow-none',
            showPlaceholder ? 'text-ink-400' : 'text-ink-900'
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            size={16}
            aria-hidden
            className={cn(
              'flex-shrink-0 text-ink-400 transition-transform duration-hover ease-brand',
              open && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="listbox"
              aria-activedescendant={
                highlight >= 0 && options[highlight]
                  ? `${id}-opt-${options[highlight].value}`
                  : undefined
              }
              onKeyDown={onPanelKeyDown}
              className="absolute z-30 mt-1 w-full origin-top overflow-hidden rounded-sm border border-ink-300 bg-bone-50/80 shadow-md backdrop-blur-md"
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={motionTransition(reduce, springs.snappy)}
            >
              <ul className="max-h-56 overflow-y-auto py-1">
                {options.map((opt, i) => (
                  <li
                    key={opt.value}
                    id={`${id}-opt-${opt.value}`}
                    role="option"
                    aria-selected={opt.value === value}
                  >
                    <button
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && commit(opt)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-hover ease-brand',
                        opt.value === value
                          ? 'bg-pine-800 text-bone-50'
                          : highlight === i
                          ? 'bg-ink-100 text-ink-900'
                          : 'text-ink-700',
                        opt.disabled && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.value === value && (
                        <Check size={16} aria-hidden className="flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };

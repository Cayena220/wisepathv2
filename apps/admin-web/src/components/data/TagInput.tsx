import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

/** Type and press Enter (or comma) to add; click × to remove. */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 30,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  id?: string;
}) {
  const [text, setText] = React.useState('');
  const add = () => {
    const tag = text.trim().replace(/,$/, '');
    if (!tag || value.includes(tag) || value.length >= max) return setText('');
    onChange([...value, tag]);
    setText('');
  };
  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-white px-2 py-1.5 shadow-xs focus-within:border-gold-500 focus-within:ring-3 focus-within:ring-gold-500/20',
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-teal-50 py-0.5 pr-1 pl-2 text-[13px] text-teal-700 ring-1 ring-teal-600/15">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 hover:bg-teal-100" aria-label={`Remove ${tag}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-navy-400"
      />
    </div>
  );
}

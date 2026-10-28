'use client'

interface RankingFieldProps {
  label: string
  options: string[]
  labels?: Record<string, string>
  value?: string[]
  onChange: (value: string[]) => void
  required?: boolean
  /** Instruction under the label; the parent supplies the localised string. */
  hint?: string
}

// Fully controlled: the parent (PayloadForm) owns the order via value/onChange,
// so this component renders straight from props instead of syncing them into
// local state. That sync was the bug — any parent re-render with a fresh
// `options`/`value` array identity clobbered the user's in-progress drag.
export default function RankingField({ label, options, labels, value = [], onChange, required, hint }: RankingFieldProps) {
  const items = value.length > 0 ? value : options

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return

    const newItems = [...items]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    onChange(newItems)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="block text-foreground font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </legend>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="space-y-2 mt-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, index - 1)}
                className={`w-6 h-6 flex items-center justify-center rounded hover:bg-highlight text-muted-foreground hover:text-accent transition-colors ${index === 0 ? 'invisible' : ''}`}
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, index + 1)}
                className={`w-6 h-6 flex items-center justify-center rounded hover:bg-highlight text-muted-foreground hover:text-accent transition-colors ${index === items.length - 1 ? 'invisible' : ''}`}
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-secondary rounded-full font-bold text-accent text-sm shrink-0">
              {index + 1}
            </div>
            <span className="text-foreground font-medium">{labels?.[item] || item}</span>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

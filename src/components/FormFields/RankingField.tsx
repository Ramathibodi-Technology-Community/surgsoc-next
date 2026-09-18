'use client'

interface RankingFieldProps {
  label: string
  options: string[]
  value?: string[]
  onChange: (value: string[]) => void
  required?: boolean
}

// Fully controlled: the parent (PayloadForm) owns the order via value/onChange,
// so this component renders straight from props instead of syncing them into
// local state. That sync was the bug — any parent re-render with a fresh
// `options`/`value` array identity clobbered the user's in-progress drag.
export default function RankingField({ label, options, value = [], onChange, required }: RankingFieldProps) {
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
      <legend className="block text-base-9 font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </legend>
      <p className="text-sm text-base-6">Drag to reorder by preference (Standard click-to-move implemented for reliability)</p>
      <div className="space-y-2 mt-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex items-center gap-3 p-3 bg-base-2 border border-base-3 rounded-lg hover:border-primary-1/50 transition-colors group"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, index - 1)}
                disabled={index === 0}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-base-3 text-base-6 hover:text-primary-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, index + 1)}
                disabled={index === items.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-base-3 text-base-6 hover:text-primary-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-base-3 rounded-full font-bold text-primary-1 text-sm shrink-0">
              {index + 1}
            </div>
            <span className="text-base-9 font-medium">{item}</span>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

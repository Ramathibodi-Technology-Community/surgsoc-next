import { Skeleton } from '@/components/ui/skeleton'

// Shaped like the homepage — hero panel, then a couple of card rails — so the
// swap-in doesn't jump. Every other route falls back to this one too; it's
// close enough to a generic page shape that a mismatch reads as loading, not
// broken.
export default function Loading() {
  return (
    <>
      <div className="panel mb-[52px] overflow-hidden rounded-[10px] p-6 sm:p-11">
        <Skeleton className="mb-[22px] h-3 w-64" />
        <Skeleton className="mb-2.5 h-10 w-3/4 max-w-md" />
        <Skeleton className="mb-6 h-10 w-1/2 max-w-xs" />
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="card-grid mb-[52px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full rounded-[10px]" />
        ))}
      </div>

      <div className="card-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[90px] w-full rounded-[10px]" />
        ))}
      </div>
    </>
  )
}

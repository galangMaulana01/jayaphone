// Skeleton placeholder shown while a page fetches its data.
// Mirrors the legacy `setLoading(container, rows)` helper.

interface LoadingSkeletonProps {
  /** How many placeholder bars to render. Defaults to 4. */
  numberOfRows?: number;
}

export function LoadingSkeleton({ numberOfRows = 4 }: LoadingSkeletonProps): JSX.Element {
  const rowIndexes = Array.from({ length: numberOfRows }, (_unusedValue, rowIndex) => rowIndex);
  return (
    <div className="space-y-2" aria-label="Memuat data">
      {rowIndexes.map((rowIndex) => (
        <div key={rowIndex} className={`skeleton h-12 ${rowIndex === numberOfRows - 1 ? "w-[61.8%]" : "w-full"}`} />
      ))}
    </div>
  );
}

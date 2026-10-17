import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy aria-label="Loading listings">
      <Skeleton className="mb-2 h-4 w-36" />
      <Skeleton className="mb-6 h-12 w-64" />
      <Skeleton className="mb-3 h-12 w-full rounded-full" />
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3.6] rounded-[1.4rem]" />
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

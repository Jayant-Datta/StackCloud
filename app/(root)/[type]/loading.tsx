// app/[type]/loading.tsx (Adjust the path to wherever your page.tsx is located)

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 mt-4 w-full">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        {/* Title placeholder */}
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded-md"></div>
        {/* Filter dropdown placeholder */}
        <div className="h-10 w-28 bg-gray-200 animate-pulse rounded-md"></div>
      </div>

      {/* Total size placeholder */}
      <div className="h-5 w-24 bg-gray-200 animate-pulse rounded-md mt-1"></div>

      {/* Cards Grid Skeleton */}
      <div className="flex flex-wrap gap-4.5 overflow-y-scroll h-144 no-scrollbar mt-2">
        {/* Render a few empty skeleton cards to mimic the layout */}
        {[1, 2, 3, 4, 5].map((item) => (
          <div 
            key={item} 
            className="w-[280px] h-[220px] bg-gray-100 animate-pulse rounded-2xl shadow-sm border border-gray-50 flex flex-col p-4"
          >
            {/* Card internal skeletons to make it look realistic */}
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-4 w-3/4 bg-gray-200 rounded-md mt-auto mb-2"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded-md mb-2"></div>
            <div className="h-3 w-2/3 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
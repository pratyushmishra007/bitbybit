export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6" suppressHydrationWarning>
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/4" suppressHydrationWarning></div>
      
      {/* Content skeletons */}
      <div className="space-y-3" suppressHydrationWarning>
        <div className="h-4 bg-gray-200 rounded w-full" suppressHydrationWarning></div>
        <div className="h-4 bg-gray-200 rounded w-5/6" suppressHydrationWarning></div>
        <div className="h-4 bg-gray-200 rounded w-4/6" suppressHydrationWarning></div>
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8" suppressHydrationWarning>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3" suppressHydrationWarning>
            <div className="h-32 bg-gray-200 rounded" suppressHydrationWarning></div>
            <div className="h-4 bg-gray-200 rounded w-3/4" suppressHydrationWarning></div>
            <div className="h-3 bg-gray-200 rounded w-1/2" suppressHydrationWarning></div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

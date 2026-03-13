export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-[#E5E7EB] rounded-lg" />
        <div className="h-9 w-36 bg-[#E5E7EB] rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="h-3 w-24 bg-[#F3F4F6] rounded mb-3" />
            <div className="h-7 w-32 bg-[#E5E7EB] rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="bg-[#F9FAFB] px-4 py-3 flex gap-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 w-20 bg-[#E5E7EB] rounded" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="px-4 py-4 border-t border-[#F3F4F6] flex gap-8">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="h-4 w-24 bg-[#F3F4F6] rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

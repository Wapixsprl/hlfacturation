export default function ClientsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-[#E5E7EB] rounded-lg" />
        <div className="h-9 w-40 bg-[#17C2D7]/20 rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <div className="h-3 w-20 bg-[#F3F4F6] rounded mb-2" />
            <div className="h-6 w-16 bg-[#E5E7EB] rounded" />
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-[#F3F4F6] rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-28 bg-[#F3F4F6] rounded-full" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="bg-[#F9FAFB] px-4 py-3 flex gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-3 w-20 bg-[#E5E7EB] rounded" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 border-t border-[#F3F4F6] flex gap-6">
            <div className="h-4 w-32 bg-[#F3F4F6] rounded" />
            <div className="h-5 w-16 bg-[#F3F4F6] rounded-full" />
            <div className="h-4 w-40 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-24 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-20 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-20 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-24 bg-[#F3F4F6] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

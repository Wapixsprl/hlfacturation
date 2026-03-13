export default function ParametresLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-36 bg-[#E5E7EB] rounded-lg" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E5E7EB] pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-28 bg-[#F3F4F6] rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 bg-[#F3F4F6] rounded" />
            <div className="h-10 w-full bg-[#F3F4F6] rounded-lg" />
          </div>
        ))}
        <div className="h-9 w-32 bg-[#17C2D7]/20 rounded-lg mt-4" />
      </div>
    </div>
  )
}

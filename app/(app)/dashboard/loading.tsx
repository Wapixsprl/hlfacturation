export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-56 bg-[#E5E7EB] rounded-lg" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-20 bg-[#F3F4F6] rounded" />
              <div className="h-8 w-8 bg-[#F3F4F6] rounded-lg" />
            </div>
            <div className="h-7 w-28 bg-[#E5E7EB] rounded" />
          </div>
        ))}
      </div>

      {/* Chart + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-6">
          <div className="h-5 w-40 bg-[#E5E7EB] rounded mb-6" />
          <div className="h-[250px] bg-[#F9FAFB] rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
          <div className="h-5 w-32 bg-[#E5E7EB] rounded mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-3 border-b border-[#F3F4F6] last:border-0">
              <div className="h-4 w-full bg-[#F3F4F6] rounded mb-2" />
              <div className="h-3 w-24 bg-[#F3F4F6] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

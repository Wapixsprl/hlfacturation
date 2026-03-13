export default function FournisseursLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-[#E5E7EB] rounded-lg" />
        <div className="h-9 w-44 bg-[#17C2D7]/20 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="bg-[#F9FAFB] px-4 py-3 flex gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 w-20 bg-[#E5E7EB] rounded" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 border-t border-[#F3F4F6] flex gap-6">
            <div className="h-4 w-36 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-40 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-24 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-20 bg-[#F3F4F6] rounded" />
            <div className="h-4 w-20 bg-[#F3F4F6] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

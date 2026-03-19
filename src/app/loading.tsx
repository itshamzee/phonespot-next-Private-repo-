export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#E5E5EA] border-t-[#1A3D2E]" />
        <p className="text-sm font-medium text-[#6E6E73]">Indl&aelig;ser...</p>
      </div>
    </div>
  );
}

import { Users } from 'lucide-react';

export function ReasonTag({ reason }: { reason: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <Users className="w-2.5 h-2.5 text-violet-400 flex-shrink-0" />
      <span className="text-[11px] text-violet-300 font-medium leading-tight line-clamp-1">{reason}</span>
    </div>
  );
}

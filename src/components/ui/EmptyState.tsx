import { IconBars } from '@/components/ui/icons';

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-indigo-50/50 text-gray-400">
        <IconBars className="h-6 w-6" />
      </div>
      <p className="max-w-md text-sm leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}

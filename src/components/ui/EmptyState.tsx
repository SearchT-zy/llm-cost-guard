export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="text-3xl">📭</div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

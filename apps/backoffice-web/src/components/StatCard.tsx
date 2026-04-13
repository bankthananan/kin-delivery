export function StatCard({ title, value, prefix = '' }: { title: string, value: string | number, prefix?: string }) {
  return (
    <div className="card-container p-6">
      <h3 className="text-sm font-medium text-zinc-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{prefix}{value}</p>
    </div>
  );
}

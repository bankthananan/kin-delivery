export function DataTable({ columns, data }: { columns: { header: string, accessor: string | ((row: any) => React.ReactNode) }[], data: any[] }) {
  if (data.length === 0) return <div className="p-8 text-center text-zinc-500">No records found.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200">
        <thead>
          <tr>
            {columns.map((col, i) => <th key={i} className="table-header">{col.header}</th>)}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="table-cell">
                  {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

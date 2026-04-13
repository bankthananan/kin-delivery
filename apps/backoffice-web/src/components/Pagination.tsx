export function Pagination({ page, totalPages, onPageChange }: { page: number, totalPages: number, onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-zinc-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="btn-primary px-3 py-1 text-xs disabled:opacity-50">Previous</button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn-primary px-3 py-1 text-xs disabled:opacity-50">Next</button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div><p className="text-sm text-zinc-700">Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></p></div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 disabled:opacity-50">Prev</button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 disabled:opacity-50">Next</button>
          </nav>
        </div>
      </div>
    </div>
  );
}

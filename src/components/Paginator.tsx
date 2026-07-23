import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

export function usePaged<T>(items: T[] | undefined, pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = useMemo(
    () => (items ?? []).slice(start, start + pageSize),
    [items, start, pageSize],
  );

  return { page: safePage, setPage, pageCount, total, pageSize, start, end, paged };
}

export function Paginator({
  page,
  pageCount,
  total,
  start,
  end,
  onPageChange,
  className = "",
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (p: number) => void;
  className?: string;
}) {
  if (total <= PAGE_SIZE) return null;
  const showingFrom = total === 0 ? 0 : start + 1;
  return (
    <div
      className={
        "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted " +
        className
      }
    >
      <span>
        {showingFrom}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex size-7 items-center justify-center rounded-full border border-border text-foreground disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="px-2 text-foreground">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="flex size-7 items-center justify-center rounded-full border border-border text-foreground disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
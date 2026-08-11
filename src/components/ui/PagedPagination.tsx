import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface PagedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  windowSize?: number;
  className?: string;
}

/**
 * Windowed pagination — shows at most `windowSize` (default 8) page buttons.
 * Previous / Next slide the window. Ellipsis shown for hidden pages.
 */
export function PagedPagination({
  currentPage,
  totalPages,
  onPageChange,
  windowSize = 8,
  className = "",
}: PagedPaginationProps) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(
    1,
    Math.min(currentPage - Math.floor(windowSize / 2), totalPages - windowSize + 1)
  );
  const windowEnd = Math.min(totalPages, windowStart + windowSize - 1);

  const pages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  return (
    <div className={`py-4 border-t border-border mt-2 ${className}`}>
      <Pagination>
        <PaginationContent className="flex-wrap gap-1">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {windowStart > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(1)} className="cursor-pointer">1</PaginationLink>
              </PaginationItem>
              {windowStart > 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
            </>
          )}

          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === currentPage} onClick={() => onPageChange(p)} className="cursor-pointer">
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}

          {windowEnd < totalPages && (
            <>
              {windowEnd < totalPages - 1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

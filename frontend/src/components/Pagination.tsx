import type { PageMeta } from "../api";

export function Pagination({
  meta,
  onPage,
}: {
  meta: PageMeta;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (meta.total === 0) return null;
  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);
  const candidates = Array.from(
    new Set([1, meta.page - 1, meta.page, meta.page + 1, pages]),
  ).filter((page) => page >= 1 && page <= pages);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-summary">
        แสดง {start}–{end} จาก {meta.total} รายการ
      </span>
      <div className="pagination-buttons">
        <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          ก่อนหน้า
        </button>
        {candidates.map((page, index) => (
          <span className="page-group" key={page}>
            {index > 0 && page - candidates[index - 1] > 1 && (
              <span className="page-ellipsis">…</span>
            )}
            <button
              className={page === meta.page ? "active" : ""}
              aria-current={page === meta.page ? "page" : undefined}
              onClick={() => onPage(page)}
            >
              {page}
            </button>
          </span>
        ))}
        <button
          disabled={meta.page >= pages}
          onClick={() => onPage(meta.page + 1)}
        >
          ถัดไป
        </button>
      </div>
    </nav>
  );
}

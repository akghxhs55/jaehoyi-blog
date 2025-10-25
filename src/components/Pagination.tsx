import Link from "next/link"
import styled from "@emotion/styled"
import { useRouter } from "next/router"

type Props = {
  totalPages: number
  currentPage: number
}

const Pagination = ({ totalPages, currentPage }: Props) => {
  const router = useRouter()

  const getPageLink = (page: number) => {
    const query = { ...router.query }
    // Avoid duplicating page in both path and query
    // Keep other query params (e.g., tag, category) but remove `page`
    delete (query as any).page
    if (page === 1) {
      return { pathname: '/', query }
    }
    return { pathname: `/page/${page}`, query }
  }

  // Fixed number of page buttons (no dynamic adjustment)
  const visibleCount = Math.min(5, totalPages)


  // Build a continuous sliding window of pages without ellipses
  const getWindowPages = (maxVisible: number) => {
    const count = Math.max(1, Math.min(maxVisible, totalPages))
    // Center current page when possible
    const half = Math.floor(count / 2)
    let start = currentPage - half
    let end = currentPage + (count - half - 1)

    if (start < 1) {
      end += 1 - start
      start = 1
    }
    if (end > totalPages) {
      start -= end - totalPages
      end = totalPages
    }
    if (start < 1) start = 1

    const pages: number[] = []
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  }

  const pages = getWindowPages(visibleCount)

  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  return (
    <StyledWrapper>
      <div className="bar" role="navigation" aria-label="Pagination">
        {/* '<<' Move to First Page */}
        <Link href={isFirstPage ? "#" : getPageLink(1)} passHref>
          <button className="move" disabled={isFirstPage} aria-label="First page" title="First page">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M11.5 12L18 5.5v13L11.5 12zM6 12l6.5-6.5v13L6 12z" fill="currentColor" />
            </svg>
          </button>
        </Link>

        {/* '<' Move to Previous Page */}
        <Link href={isFirstPage ? "#" : getPageLink(currentPage - 1)} passHref>
          <button className="move" disabled={isFirstPage} aria-label="Previous page" title="Previous page">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9.5 12L16 5.5v13L9.5 12z" fill="currentColor" />
            </svg>
          </button>
        </Link>

        {/* Page Numbers */}
        <div className="page-numbers" role="list">
          {pages.map((page) => (
            <Link key={page} href={getPageLink(page)} passHref>
              <button
                className="page-number"
                data-active={currentPage === page}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            </Link>
          ))}
        </div>

        {/* '>' Move to Next Page */}
        <Link href={isLastPage ? "#" : getPageLink(currentPage + 1)} passHref>
          <button className="move" disabled={isLastPage} aria-label="Next page" title="Next page">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M14.5 12L8 5.5v13L14.5 12z" fill="currentColor" />
            </svg>
          </button>
        </Link>

        {/* '>>' Move to Last Page */}
        <Link href={isLastPage ? "#" : getPageLink(totalPages)} passHref>
          <button className="move" disabled={isLastPage} aria-label="Last page" title="Last page">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12.5 12L6 5.5v13L12.5 12zM18 12l-6.5-6.5v13L18 12z" fill="currentColor" />
            </svg>
          </button>
        </Link>
      </div>

      {/* Total pages indicator (placed below the buttons) */}
      <span className="total" aria-label={`Page ${currentPage} of ${totalPages} total pages`}>
        Page {currentPage} / {totalPages}
      </span>
    </StyledWrapper>
  )
}

export default Pagination

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
  gap: 0.5rem;
  max-width: 100%;

  .bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
    flex-wrap: nowrap;
    overflow: hidden; /* keep single row without horizontal scroll */
  }

  .move {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid ${({ theme }) => theme.colors.gray6};
    border-radius: 8px;
    cursor: pointer;
    background-color: ${({ theme }) => theme.colors.gray1 ?? 'transparent'};
    color: ${({ theme }) => theme.colors.gray11};
    box-sizing: border-box;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
    flex: 0 0 auto; /* prevent shrinking within scroll container */

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.gray3};
      border-color: ${({ theme }) => theme.colors.gray8};
    }
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.colors.blue7};
      outline-offset: 2px;
    }
    &:disabled {
      color: ${({ theme }) => theme.colors.gray8};
      cursor: default;
      opacity: 0.6;
    }

    .icon {
      width: 18px;
      height: 18px;
      display: block;
      flex: 0 0 auto;
    }
  }

  .page-number {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-width: 40px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.colors.gray6};
    border-radius: 8px;
    cursor: pointer;
    background-color: ${({ theme }) => theme.colors.gray1 ?? 'transparent'};
    font-size: 0.95rem;
    color: ${({ theme }) => theme.colors.gray12 ?? theme.colors.gray11};
    box-sizing: border-box;
    font-variant-numeric: tabular-nums;
    -moz-font-feature-settings: 'tnum';
    -webkit-font-feature-settings: 'tnum';
    font-feature-settings: 'tnum';
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
    flex: 0 0 auto; /* prevent shrinking within scroll container */

    &:hover {
      border-color: ${({ theme }) => theme.colors.gray8};
      background-color: ${({ theme }) => theme.colors.gray3};
    }
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.colors.blue7};
      outline-offset: 2px;
    }
  }

  .total {
    color: ${({ theme }) => theme.colors.gray9};
    font-size: 0.9rem;
    line-height: 1;
    user-select: none;
    white-space: nowrap;
    text-align: center;
    margin-top: 0.25rem;
    display: block;
  }

  .page-number {
    &[data-active="true"] {
      font-weight: 700;
      color: ${({ theme }) => theme.colors.gray1 ?? '#fff'};
      background-color: ${({ theme }) => theme.colors.blue9};
      border-color: ${({ theme }) => theme.colors.blue9};
    }
  }

  .page-numbers {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    max-width: max-content;
  }

  @media (max-width: 480px) {
    gap: 0.375rem;

    .bar {
      gap: 0.375rem;
    }

    .move {
      width: 36px;
      height: 36px;

      .icon { width: 16px; height: 16px; }
    }

    .page-number {
      min-width: 36px;
      height: 36px;
      font-size: 0.9rem;
      padding: 0 10px;
    }

    .page-numbers {
      gap: 0.375rem;
    }
  }
`
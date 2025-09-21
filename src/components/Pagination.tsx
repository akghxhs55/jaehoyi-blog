import Link from "next/link"
import styled from "@emotion/styled"
import { useRouter } from "next/router"

type Props = {
  totalPages: number
  currentPage: number
}

const Pagination: React.FC<Props> = ({ totalPages, currentPage }) => {
  const router = useRouter()

  const getPageLink = (page: number) => {
    const query = { ...router.query }
    if (page === 1) {
      delete query.page
      return { pathname: '/', query }
    }
    query.page = page.toString()
    return { pathname: `/page/${page}`, query }
  }

  const getPaginationGroup = () => {
    const pageLimit = 5
    const start = Math.floor((currentPage - 1) / pageLimit) * pageLimit

    return Array.from({ length: pageLimit }, (_, i) => i + start + 1)
      .filter(page => page <= totalPages)
  }

  const pages = getPaginationGroup()

  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  return (
    <StyledWrapper>
      {/* '<<' Move to First Page */}
      <Link href={isFirstPage ? "#" : getPageLink(1)} passHref>
        <button className="move" disabled={isFirstPage}>
          &lt;&lt;
        </button>
      </Link>

      {/* '<' Move to Previous Page */}
      <Link href={isFirstPage ? "#" : getPageLink(currentPage - 1)} passHref>
        <button className="move" disabled={isFirstPage}>
          &lt;
        </button>
      </Link>

      {/* Page Numbers */}
      <div className="page-numbers">
        {pages.map((page) => (
          <Link key={page} href={getPageLink(page)} passHref>
            <button
              className="page-number"
              data-active={currentPage === page}
            >
              {page}
            </button>
          </Link>
        ))}
      </div>

      {/* '>' Move to Next Page */}
      <Link href={isLastPage ? "#" : getPageLink(currentPage + 1)} passHref>
        <button className="move" disabled={isLastPage}>
          &gt;
        </button>
      </Link>

      {/* '>>' Move to Last Page */}
      <Link href={isLastPage ? "#" : getPageLink(totalPages)} passHref>
        <button className="move" disabled={isLastPage}>
          &gt;&gt;
        </button>
      </Link>
    </StyledWrapper>
  )
}

export default Pagination

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2rem 0;
  gap: 0.5rem;

  .move,
  .page-number {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 32px;
    height: 32px;
    padding: 6px;
    border: 1px solid ${({ theme }) => theme.colors.gray6};
    border-radius: 8px;
    cursor: pointer;
    background-color: transparent;
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.gray11};

    &:hover {
      border-color: ${({ theme }) => theme.colors.gray9};
    }
    
    &:disabled {
      color: ${({ theme }) => theme.colors.gray8};
      cursor: not-allowed;
      &:hover {
        border-color: ${({ theme }) => theme.colors.gray6};
      }
    }
  }

  .page-number {
    &[data-active="true"] {
      font-weight: bold;
      color: ${({ theme }) => theme.colors.blue10};
      border-color: ${({ theme }) => theme.colors.blue9};
    }
  }

  .page-numbers {
    display: flex;
    gap: 0.5rem;
  }
`
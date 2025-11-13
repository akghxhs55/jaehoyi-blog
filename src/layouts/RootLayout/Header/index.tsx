import NavBar from "./NavBar"
import Logo from "./Logo"
import ThemeToggle from "./ThemeToggle"
import styled from "@emotion/styled"
import { zIndexes } from "src/styles/zIndexes"
import usePostQuery from "src/hooks/usePostQuery"
import { useRouter } from "next/router"
import React, { useRef } from "react"


type Props = {
  fullWidth: boolean
}

const Header: React.FC<Props> = ({ fullWidth }) => {
  const router = useRouter()
  const post = usePostQuery()
  const showTitle = Boolean(post?.title) && router.pathname === "/[slug]"

  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearchSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = (formData.get("q") as string)?.trim()
    if (q) {
      router.push({ pathname: "/", query: { q } })
    } else {
      router.push("/")
    }
  }

  const handleSearchClick: React.MouseEventHandler<HTMLFormElement> = (e) => {
    if (!(e.target instanceof HTMLInputElement)) {
      searchInputRef.current?.focus()
    }
  }

  return (
    <StyledWrapper>
      <div data-full-width={fullWidth} className="container">
        <Logo />
        {showTitle && <div className="title" title={post!.title}>{post!.title}</div>}
        <div className="nav">
          <form className="search" role="search" onSubmit={handleSearchSubmit} onClick={handleSearchClick}>
            <input ref={searchInputRef} name="q" type="search" placeholder="Search..." aria-label="Search posts" />
          </form>
          <ThemeToggle />
          <NavBar />
        </div>
      </div>
    </StyledWrapper>
  )
}

export default Header

const StyledWrapper = styled.div`
  z-index: ${zIndexes.header};
  position: sticky;
  top: 0;
  backdrop-filter: saturate(180%) blur(8px);
  background-color: ${({ theme }) => theme.scheme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(22,22,22,0.5)'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray6};

  .container {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 0.75rem;
    padding-left: 1rem;
    padding-right: 1rem;
    align-items: center;
    width: 100%;
    max-width: 1120px;
    height: 3rem;
    margin: 0 auto;
    &[data-full-width="true"] {
      @media (min-width: 768px) {
        padding-left: 6rem;
        padding-right: 6rem;
      }
    }
    .title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${({ theme }) => theme.colors.gray11};
      font-size: 0.95rem;
      text-align: center;
    }
    .nav {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      justify-content: flex-end;
    }
    .search {
      display: none;
    }
    @media (min-width: 640px) {
      .search {
        display: block;
      }
      .search input {
        height: 28px;
        border-radius: 9999px;
        padding: 0 10px;
        background: ${({ theme }) => theme.colors.gray4};
        border: 1px solid ${({ theme }) => theme.colors.gray6};
        color: ${({ theme }) => theme.colors.gray12};
        font-size: 0.9rem;
        outline: none;
        width: 180px;
      }
    }
  }
`

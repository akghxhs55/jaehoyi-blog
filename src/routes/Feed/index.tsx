import { useEffect, useMemo, useState } from "react"
import Head from "next/head"

import SearchInput from "./SearchInput"
import { FeedHeader } from "./FeedHeader"
import Footer from "./Footer"
import styled from "@emotion/styled"
import TagList from "./TagList"
import MobileProfileCard from "./MobileProfileCard"
import ProfileCard from "./ProfileCard"
import ServiceCard from "./ServiceCard"
import ContactCard from "./ContactCard"
import PostList from "./PostList"
import PinnedPosts from "./PostList/PinnedPosts"
import { TPost } from "src/types"
import { useRouter } from "next/router"
import { filterPosts } from "./PostList/filterPosts"
import { DEFAULT_CATEGORY } from "src/constants"
import { CONFIG } from "site.config"
import Pagination from "src/components/Pagination"

const HEADER_HEIGHT = 73

type Props = {
  posts: TPost[]
  allTags: string[]
}

const TAG_MODE_STORAGE_KEY = "feed_tag_mode"

const Feed: React.FC<Props> = ({ posts, allTags }) => {
  const router = useRouter()
  const q = typeof router.query.q === "string" ? router.query.q : ""
  const [inputQ, setInputQ] = useState(q)

  const [tagMode, setTagMode] = useState<"and" | "or">(() => {
    // 쿼리에 명시된 값이 있으면 우선 사용
    const raw = typeof window === "undefined" ? undefined : router.query.tagMode
    if (raw === "or" || raw === "and") return raw
    if (Array.isArray(raw)) {
      const v = raw[0]
      if (v === "or" || v === "and") return v
    }
    return "and"
  })

  // 마운트 시 로컬 스토리지에서 모드 복원 (쿼리에 명시가 없을 때만)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!router.isReady) return

    const rawQuery = router.query.tagMode
    if (rawQuery === "and" || rawQuery === "or") {
      setTagMode(rawQuery)
      return
    }

    const stored = window.localStorage.getItem(TAG_MODE_STORAGE_KEY) as
      | "and"
      | "or"
      | null
    if (stored === "and" || stored === "or") {
      setTagMode(stored)
      const query = { ...router.query, tagMode: stored }
      delete (query as any).page
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
    }
  }, [router])

  const toggleTagMode = () => {
    const nextMode: "and" | "or" = tagMode === "and" ? "or" : "and"
    setTagMode(nextMode)

    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAG_MODE_STORAGE_KEY, nextMode)
    }

    const query = { ...router.query, tagMode: nextMode }
    delete (query as any).page
    router.push({ pathname: router.pathname, query })
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const query = { ...router.query }
    const tag = query.tag
    const category = query.category as string | undefined

    const nextQ = inputQ?.trim() || ""
    if (nextQ) (query as any).q = nextQ
    else delete (query as any).q

    // Reset page when performing a new search
    delete (query as any).page

    // Route-based navigation: keep current context (tag/category) if present
    let pathname = "/"
    if (category && typeof category === "string") {
      pathname = `/category/${encodeURIComponent(category)}`
    } else if (tag) {
      pathname = "/"
    }

    router.push({ pathname, query })
  }

  // Keep input value in sync with the current query param, but do not live-filter
  useEffect(() => {
    setInputQ(q)
  }, [q])

  const { paginatedPosts, totalPages, currentPage } = useMemo(() => {
    const tag = router.query.tag
    const category =
      typeof router.query.category === "string"
        ? router.query.category
        : DEFAULT_CATEGORY
    const order = (typeof router.query.order === "string" ? router.query.order : "desc") as
      | "asc"
      | "desc"
    const filtered = filterPosts({ posts, q, tag, category, order, tagMode })

    const postsPerPage = CONFIG.postsPerPage
    const rawPage = router.query.page
    const pageNum = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage) || 1
    const safePage = Math.max(
      1,
      Math.min(pageNum, Math.max(1, Math.ceil(filtered.length / postsPerPage))),
    )
    const start = (safePage - 1) * postsPerPage
    const end = start + postsPerPage

    return {
      paginatedPosts: filtered.slice(start, end),
      totalPages: Math.max(1, Math.ceil(filtered.length / postsPerPage)),
      currentPage: safePage,
    }
  }, [posts, q, router.query.tag, router.query.category, router.query.order, router.query.page, tagMode])

  return (
    <>
      {q && (
        <Head>
          <meta name="robots" content="noindex,follow" />
        </Head>
      )}
      <StyledWrapper>
        <div
          className="lt"
          css={{
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          }}
        >
          <TagList allTags={allTags} tagMode={tagMode} onToggleTagMode={toggleTagMode} />
        </div>
        <div className="mid">
          <MobileProfileCard />
          <PinnedPosts q={q} />
          <SearchInput
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            onSubmit={handleSearch}
          />
          <div className="tags">
            <TagList allTags={allTags} tagMode={tagMode} onToggleTagMode={toggleTagMode} />
          </div>
          <FeedHeader />
          <PostList posts={paginatedPosts} q={q} />
          <Pagination currentPage={currentPage} totalPages={totalPages} />
          <div className="footer">
            <Footer />
          </div>
        </div>
        <div
          className="rt"
          css={{
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          }}
        >
          <ProfileCard />
          <ServiceCard />
          <ContactCard />
          <div className="footer">
            <Footer />
          </div>
        </div>
      </StyledWrapper>
    </>
  )
}

export default Feed

const StyledWrapper = styled.div`
  grid-template-columns: repeat(12, minmax(0, 1fr));

  padding: 2rem 0;
  display: grid;
  gap: 1.5rem;

  @media (max-width: 768px) {
    display: block;
    padding: 0.5rem 0;
  }

  > .lt {
    display: none;
    overflow: scroll;
    position: sticky;
    grid-column: span 2 / span 2;
    top: ${HEADER_HEIGHT - 10}px;

    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }

    @media (min-width: 1024px) {
      display: block;
    }
  }

  > .mid {
    grid-column: span 12 / span 12;

    @media (min-width: 1024px) {
      grid-column: span 7 / span 7;
    }

    > .tags {
      display: block;

      @media (min-width: 1024px) {
        display: none;
      }
    }

    > .footer {
      padding-bottom: 2rem;
      @media (min-width: 1024px) {
        display: none;
      }
    }
  }

  > .rt {
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }

    display: none;
    overflow: scroll;
    position: sticky;
    top: ${HEADER_HEIGHT - 10}px;

    @media (min-width: 1024px) {
      display: block;
      grid-column: span 3 / span 3;
    }

    .footer {
      padding-top: 1rem;
    }
  }
`

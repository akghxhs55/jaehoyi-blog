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

const HEADER_HEIGHT = 73

type Props = {
  posts: TPost[]
  allTags: string[]
}

const Feed: React.FC<Props> = ({ posts, allTags }) => {
  const router = useRouter()
  const [q, setQ] = useState((router.query.q as string) || "")

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const query = { ...router.query }
    const tag = query.tag as string | undefined
    const category = query.category as string | undefined

    if (q) query.q = q
    else delete query.q

    delete (query as any).page
    // Route-based navigation: keep current context (tag/category) if present
    let pathname = '/'
    if (category) pathname = `/category/${encodeURIComponent(category)}`
    else if (tag) pathname = `/tag/${encodeURIComponent(tag)}`

    router.push({ pathname, query })
  }

  useEffect(() => {
    setQ((router.query.q as string) || "")
  }, [router.query.q])

  const displayedPosts = useMemo(() => {
    const tag = typeof router.query.tag === 'string' ? router.query.tag : undefined
    const category = typeof router.query.category === 'string' ? router.query.category : DEFAULT_CATEGORY
    const order = (typeof router.query.order === 'string' ? router.query.order : 'desc') as 'asc' | 'desc'
    return filterPosts({ posts, q, tag, category, order })
  }, [posts, q, router.query.tag, router.query.category, router.query.order])

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
          <TagList allTags={allTags} />
        </div>
        <div className="mid">
          <MobileProfileCard />
          <PinnedPosts q={q} />
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onSubmit={handleSearch} />
          <div className="tags">
            <TagList allTags={allTags} />
          </div>
          <FeedHeader />
          <PostList posts={displayedPosts} q={q} />
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

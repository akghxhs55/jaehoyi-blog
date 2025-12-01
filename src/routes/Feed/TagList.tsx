import styled from "@emotion/styled"
import { useRouter } from "next/router"
import React, { useMemo } from "react"
import { Emoji } from "src/components/Emoji"

type TagMode = "and" | "or"

type Props = {
  allTags: string[]
  tagMode?: TagMode
  onToggleTagMode?: () => void
}

const TagList: React.FC<Props> = ({ allTags, tagMode = "and", onToggleTagMode }) => {
  const router = useRouter()
  const rawTag = router.query.tag

  const selectedTags = useMemo(() => {
    if (!rawTag) return [] as string[]
    if (Array.isArray(rawTag)) return rawTag as string[]
    // support comma separated form just in case
    return rawTag.split(",").filter(Boolean)
  }, [rawTag])

  const isSelected = (tag: string) => selectedTags.includes(tag)

  const buildNextTags = (tag: string) => {
    // toggle behaviour: add if not exists, remove if exists
    if (isSelected(tag)) {
      return selectedTags.filter((t) => t !== tag)
    }
    return [...selectedTags, tag]
  }

  const handleClickTag = (value: string) => {
    const nextTags = buildNextTags(value)

    // no tag selected -> go home without tag param
    if (nextTags.length === 0) {
      router.push({ pathname: "/", query: { ...router.query, tag: undefined } }, undefined, {
        shallow: false,
      })
      return
    }

    router.push(
      {
        pathname: "/",
        query: { ...router.query, tag: nextTags },
      },
      undefined,
      { shallow: false },
    )
  }

  return (
    <StyledWrapper data-has-selected={selectedTags.length > 0}
    >
      <div className="top">
        <div className="top-inner">
          <span className="label">
            <Emoji>🏷️</Emoji> Tags
          </span>
          {onToggleTagMode && (
            <button
              type="button"
              className="tag-mode-toggle"
              onClick={onToggleTagMode}
            >
              {tagMode === "and" ? "AND" : "OR"}
            </button>
          )}
        </div>
      </div>
      <div className="list">
        {allTags.map((key) => (
          <a
            key={key}
            data-active={isSelected(key)}
            onClick={() => handleClickTag(key)}
          >
            {key}
          </a>
        ))}
      </div>
    </StyledWrapper>
  )
}

export default TagList

const StyledWrapper = styled.div`
  .top {
    display: none;
    padding: 0.25rem;
    margin-bottom: 0.75rem;

    @media (min-width: 1024px) {
      display: block;
    }

    .top-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .label {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tag-mode-toggle {
      padding: 0.1rem 0.55rem;
      border-radius: 999px;
      border: 1px solid ${({ theme }) => theme.colors.gray5};
      font-size: 0.7rem;
      cursor: pointer;
      background-color: ${({ theme }) => theme.colors.gray3};
      color: ${({ theme }) => theme.colors.gray11};
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease,
        opacity 0.15s ease;
      opacity: 0.5;

      /* 태그가 하나라도 선택된 경우 더 또렷하게 */
      [data-has-selected="true"] & {
        opacity: 1;
      }

      &:hover {
        background-color: ${({ theme }) => theme.colors.gray5};
        border-color: ${({ theme }) => theme.colors.gray6};
        color: ${({ theme }) => theme.colors.gray12};
      }
    }
  }

  .list {
    display: flex;
    margin-bottom: 1.5rem;
    gap: 0.25rem;
    overflow: scroll;

    scrollbar-width: none;
    -ms-overflow-style: none;
    ::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    @media (min-width: 1024px) {
      display: block;
    }

    a {
      display: block;
      padding: 0.25rem;
      padding-left: 1rem;
      padding-right: 1rem;
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: ${({ theme }) => theme.colors.gray10};
      flex-shrink: 0;
      cursor: pointer;

      :hover {
        background-color: ${({ theme }) => theme.colors.gray4};
      }
      &[data-active="true"] {
        color: ${({ theme }) => theme.colors.gray12};
        background-color: ${({ theme }) => theme.colors.gray4};

        :hover {
          background-color: ${({ theme }) => theme.colors.gray4};
        }
      }
    }
  }
`

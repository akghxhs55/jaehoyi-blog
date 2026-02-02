import { FC, useEffect, useState, useCallback, useMemo } from "react"
import styled from "@emotion/styled"
import { ExtendedRecordMap } from "notion-types"
import { getPageTableOfContents } from "notion-utils"

type Props = {
  recordMap: ExtendedRecordMap
}

const HEADER_HEIGHT = 56

const TableOfContents: FC<Props> = ({ recordMap }) => {
  const [activeId, setActiveId] = useState<string>("")

  const toc = useMemo(() => {
    const keys = Object.keys(recordMap.block)
    const pageBlockId = keys[0]
    if (!pageBlockId) return []
    const pageBlock = recordMap.block[pageBlockId]?.value
    if (!pageBlock || pageBlock.type !== "page") return []
    return getPageTableOfContents(pageBlock as any, recordMap)
  }, [recordMap])

  const getElement = useCallback((id: string) => {
    const cleanId = id.replace(/-/g, "")
    return document.querySelector<HTMLElement>(`.notion-block-${cleanId}`)
  }, [])

  useEffect(() => {
    if (toc.length === 0) return

    const handleScroll = () => {
      let currentId = ""
      for (const entry of toc) {
        const el = getElement(entry.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= HEADER_HEIGHT + 20) {
          currentId = entry.id
        } else {
          break
        }
      }
      setActiveId(currentId)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [toc, getElement])

  const handleClick = useCallback(
    (id: string) => {
      const el = getElement(id)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - 12
      window.scrollTo({ top, behavior: "smooth" })
    },
    [getElement]
  )

  if (toc.length === 0) return null

  return (
    <StyledWrapper>
      <nav>
        {toc.map((entry) => (
          <StyledItem
            key={entry.id}
            indent={entry.indentLevel}
            active={activeId === entry.id}
            onClick={() => handleClick(entry.id)}
          >
            {entry.text}
          </StyledItem>
        ))}
      </nav>
    </StyledWrapper>
  )
}

export default TableOfContents

const StyledWrapper = styled.aside`
  position: fixed;
  top: calc(56px + 5rem);
  left: calc(50% + 29rem + 1rem);
  width: 200px;
  max-height: calc(100vh - 56px - 6rem);
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1279px) {
    display: none;
  }
`

const StyledItem = styled.div<{ indent: number; active: boolean }>`
  padding: 4px 0 4px ${({ indent }) => indent * 12}px;
  font-size: 0.8rem;
  line-height: 1.5;
  cursor: pointer;
  color: ${({ active, theme }) =>
    active ? theme.colors.indigo10 : theme.colors.gray10};
  font-weight: ${({ active }) => (active ? 500 : 400)};
  transition: color 0.15s;
  border-left: 2px solid
    ${({ active, theme }) =>
      active ? theme.colors.indigo10 : "transparent"};
  padding-left: ${({ indent }) => 8 + indent * 12}px;

  &:hover {
    color: ${({ theme }) => theme.colors.indigo10};
  }
`

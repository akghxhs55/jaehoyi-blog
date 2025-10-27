import styled from "@emotion/styled"
import React from "react"
import { useRouter } from "next/router"

type Props = {
  children: string
}

const Tag: React.FC<Props> = ({ children }) => {
  const router = useRouter()

  const navigateToTag = () => {
    const href = `/?tag=${encodeURIComponent(children)}`
    router.push(href)
  }

  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigateToTag()
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      navigateToTag()
    }
  }

  return (
    <StyledWrapper role="link" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
      {children}
    </StyledWrapper>
  )
}

export default Tag

const StyledWrapper = styled.span`
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 50px;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.gray10};
  background-color: ${({ theme }) => theme.colors.gray5};
  cursor: pointer;
`

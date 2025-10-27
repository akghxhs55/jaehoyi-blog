import styled from "@emotion/styled"
import React from "react"
import Link from "next/link"

type Props = {
  children: string
}

const Tag: React.FC<Props> = ({ children }) => {
  const href = `/?tag=${encodeURIComponent(children)}`
  return (
    <Link href={href} passHref legacyBehavior>
      <StyledWrapper as="a">{children}</StyledWrapper>
    </Link>
  )
}

export default Tag

const StyledWrapper = styled.div`
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

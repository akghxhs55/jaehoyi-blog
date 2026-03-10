import styled from "@emotion/styled"
import React, { InputHTMLAttributes, useRef } from "react"
import { Emoji } from "src/components/Emoji"

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSubmit'> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

const SearchInput: React.FC<Props> = ({ onSubmit, ...props }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <StyledWrapper>
      <div className="top">
        <Emoji>🔎</Emoji> Search
      </div>
      <form onSubmit={onSubmit} className="mid" role="search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Keyword..."
          {...props}
        />
      </form>
    </StyledWrapper>
  )
}

export default SearchInput

const StyledWrapper = styled.div`
  margin-bottom: 1rem;

  @media (min-width: 768px) {
    margin-bottom: 2rem;
  }
  > .top {
    padding: 0.25rem;
    margin-bottom: 0.75rem;
  }
  > .mid {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    border-radius: 1rem;
    outline-style: none;
    width: 100%;
    background-color: ${({ theme }) => theme.colors.gray4};
    cursor: text;
  }
`

import Link from "next/link"
import { CONFIG } from "site.config"
import styled from "@emotion/styled"
import Image from "next/image"

const Logo = () => {
  return (
    <StyledWrapper href="/" aria-label={CONFIG.blog.title}>
      <span className="icon">
        <Image src={CONFIG.profile.image} alt="Blog icon" width={24} height={24} sizes="24px" />
      </span>
      <span className="title">{CONFIG.blog.title}</span>
    </StyledWrapper>
  )
}

export default Logo

const StyledWrapper = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  .icon {
    display: inline-flex;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    overflow: hidden;
  }
  .title {
    white-space: nowrap;
  }
`

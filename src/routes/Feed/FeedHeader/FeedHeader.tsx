import React from "react"
import CategorySelect from "./CategorySelect"
import OrderButtons from "./OrderButtons"
import styled from "@emotion/styled"
import { TPost } from "src/types"

type Props = {
  posts: TPost[]
}

const FeedHeader: React.FC<Props> = ({ posts }) => {
  return (
    <StyledWrapper>
      <CategorySelect posts={posts} />
      <OrderButtons />
    </StyledWrapper>
  )
}

export default FeedHeader

const StyledWrapper = styled.div`
  display: flex;
  margin-bottom: 1rem;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray6};
`

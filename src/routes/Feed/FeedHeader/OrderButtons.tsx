import styled from "@emotion/styled"
import { useRouter } from "next/router"
import React from "react"

type TOrder = "asc" | "desc"

type Props = {}

const OrderButtons: React.FC<Props> = () => {
  const router = useRouter()

  const currentOrder = `${router.query.order || ``}` || ("desc" as TOrder)

  const handleClickOrderBy = (value: TOrder) => {
    const query = { ...router.query }
    const tag = query.tag
    const category = query.category as string | undefined

    delete query.page
    query.order = value

    let pathname = "/"
    if (category && typeof category === "string") {
      pathname = `/category/${encodeURIComponent(category)}`
      delete query.category
    } else if (tag && typeof tag === "string") {
      pathname = `/tag/${encodeURIComponent(tag)}`
      delete query.tag
    }

    router.push({ pathname, query })
  }
  return (
    <StyledWrapper>
      <a
        data-active={currentOrder === "desc"}
        onClick={() => handleClickOrderBy("desc")}
      >
        Desc
      </a>
      <a
        data-active={currentOrder === "asc"}
        onClick={() => handleClickOrderBy("asc")}
      >
        Asc
      </a>
    </StyledWrapper>
  )
}

export default OrderButtons

const StyledWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  a {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.gray10};

    &[data-active="true"] {
      font-weight: 700;

      color: ${({ theme }) => theme.colors.gray12};
    }
  }
`

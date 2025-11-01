import useMermaidEffect from "./hooks/useMermaidEffect"
import PostDetail from "./PostDetail"
import PageDetail from "./PageDetail"
import styled from "@emotion/styled"
import usePostQuery from "src/hooks/usePostQuery"

type Props = {}

const Detail: React.FC<Props> = () => {
  const data = usePostQuery()
  useMermaidEffect()

  // Always render a stable wrapper to avoid SSR/CSR tree mismatch
  const type = data?.type?.[0] ?? "Post"

  return (
    <StyledWrapper data-type={type}>
      {!data ? (
        <Skeleton />
      ) : type === "Page" ? (
        <PageDetail />
      ) : (
        <PostDetail />
      )}
    </StyledWrapper>
  )
}

export default Detail

const StyledWrapper = styled.div`
  padding: 2rem 0;

  &[data-type="Paper"] {
    padding: 40px 0;
  }
  /** Reference: https://github.com/chriskempson/tomorrow-theme **/
  code[class*="language-mermaid"],
  pre[class*="language-mermaid"] {
    background-color: ${({ theme }) => theme.colors.gray5};
  }
`

const Skeleton = () => {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div style={{ height: 28, width: "60%", background: "#e1e1e1", borderRadius: 4 }} />
      <div style={{ height: 18, width: "80%", background: "#eaeaea", borderRadius: 4 }} />
      <div style={{ height: 18, width: "70%", background: "#ececec", borderRadius: 4 }} />
      <div style={{ height: 200, width: "100%", background: "#f3f3f3", borderRadius: 8 }} />
    </div>
  )
}

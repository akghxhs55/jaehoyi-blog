import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/router"
import { queryKey } from "src/constants/queryKey"
import { PostDetail } from "src/types"

const usePostQuery = () => {
  const router = useRouter()
  const { slug: rawSlug } = router.query

  // Derive slug from query first, then fall back to asPath on the very first client render
  // so that the React Query key matches the one used during SSR dehydration.
  let slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug
  if (typeof slug !== "string") {
    const path = (router.asPath || "").split("?")[0]
    const candidate = path.startsWith("/") ? path.slice(1) : path
    if (candidate) slug = candidate
  }

  const stableKey = typeof slug === "string" ? queryKey.post(slug) : queryKey.post("")

  const { data } = useQuery<PostDetail>({
    queryKey: stableKey,
    enabled: false, // rely on dehydrated data; do not refetch on the client
  })

  return data
}

export default usePostQuery

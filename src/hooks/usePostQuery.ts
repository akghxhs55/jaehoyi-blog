import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/router"
import { queryKey } from "src/constants/queryKey"
import { PostDetail } from "src/types"

const usePostQuery = () => {
  const router = useRouter()
  const { slug: rawSlug } = router.query
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug

  // Use a stable placeholder key until slug is a string; keep enabled:false to avoid fetching.
  const stableKey = typeof slug === "string" ? queryKey.post(slug) : queryKey.post("")

  const { data } = useQuery<PostDetail>({
    queryKey: stableKey,
    enabled: false,
  })

  return data
}

export default usePostQuery

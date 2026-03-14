import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getCookie, setCookie } from "cookies-next"
import { useEffect } from "react"
import { CONFIG } from "site.config"
import { queryKey } from "src/constants/queryKey"
import { SchemeType } from "src/types"

type SetScheme = (scheme: SchemeType) => void

const useScheme = (): [SchemeType, SetScheme] => {
  const queryClient = useQueryClient()
  const followsSystemTheme = CONFIG.blog.scheme === "system"

  const { data } = useQuery({
    queryKey: queryKey.scheme(),
    enabled: false,
    initialData: followsSystemTheme
      ? "light"
      : (CONFIG.blog.scheme as SchemeType),
  })

  const setScheme = (scheme: SchemeType) => {
    setCookie("scheme", scheme)
    queryClient.setQueryData(queryKey.scheme(), scheme)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const cachedScheme = getCookie("scheme") as SchemeType
    
    // Determine the initial scheme
    const getSystemScheme = () => 
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

    const initialScheme = cachedScheme || (followsSystemTheme ? getSystemScheme() : data)

    if (data !== initialScheme) {
      setScheme(initialScheme as SchemeType)
    }

    // If following system theme, listen for changes
    if (followsSystemTheme) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if the user hasn't manually overridden (optional choice, 
        // but usually 'system' means it follows system unless switched)
        // Here we'll respect the switch if cachedScheme exists, 
        // but if we want TRUE 'system' mode, we might ignore cache.
        // For now, let's allow system changes to trigger updates.
        const nextScheme = e.matches ? "dark" : "light"
        setScheme(nextScheme)
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [data, followsSystemTheme])

  return [data as SchemeType, setScheme]
}

export default useScheme

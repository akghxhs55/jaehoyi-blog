import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { queryKey } from "src/constants/queryKey"

/**
 *  Wait until there is at least one mermaid code block present in the DOM.
 *  Resolves with the HTMLCollection or rejects on timeout.
 */
const waitForMermaid = (interval = 100, timeout = 5000) => {
  return new Promise<HTMLCollectionOf<Element>>((resolve, reject) => {
    const startTime = Date.now()
    const checkMerMaidCode = () => {
      if (typeof document !== "undefined") {
        const elements: HTMLCollectionOf<Element> =
          document.getElementsByClassName("language-mermaid")
        if (elements.length > 0) {
          resolve(elements)
          return
        }
      }
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`No mermaid blocks found within the timeout period.`))
      } else {
        setTimeout(checkMerMaidCode, interval)
      }
    }
    checkMerMaidCode()
  })
}
const useMermaidEffect = () => {
  const [memoMermaid, setMemoMermaid] = useState<Map<number, string>>(new Map())

  const { data, isFetched } = useQuery({
    queryKey: queryKey.scheme(),
    enabled: false,
  })

  useEffect(() => {
    if (!isFetched) return
    if (typeof document === "undefined") return

    let canceled = false

    waitForMermaid()
      .then(async (elements) => {
        if (canceled) return
        const mermaidModule = await import("mermaid")
        const mermaid = (mermaidModule as any).default ?? mermaidModule
        mermaid.initialize({
          startOnLoad: true,
          theme: (data as "dark" | "light") === "dark" ? "dark" : "default",
        })

        const promises = Array.from(elements)
          .filter((el) => el.tagName === "PRE")
          .map(async (element, i) => {
            if (memoMermaid.get(i) !== undefined) {
              const svg = await mermaid
                .render("mermaid" + i, memoMermaid.get(i) || "")
                .then((res: any) => res.svg)
              ;(element as HTMLElement).animate(
                [
                  { easing: "ease-in", opacity: 0 },
                  { easing: "ease-out", opacity: 1 },
                ],
                { duration: 300, fill: "both" }
              )
              ;(element as HTMLElement).innerHTML = svg
              return
            }
            const svg = await mermaid
              .render("mermaid" + i, element.textContent || "")
              .then((res: any) => res.svg)
            setMemoMermaid(memoMermaid.set(i, element.textContent ?? ""))
            ;(element as HTMLElement).innerHTML = svg
          })
        await Promise.all(promises)
      })
      .catch((error) => {
        console.warn(error)
      })

    return () => {
      canceled = true
    }
  }, [data, isFetched])

  return
}

export default useMermaidEffect

import { TPost } from "src/types"
import { CONFIG } from "site.config"
import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

const UtterancesComponent = dynamic(
  () => {
    return import("./Utterances")
  },
  { ssr: false }
)
const SimpleComment = dynamic(() => import("./SimpleComment"), { ssr: false })

type Props = {
  data: TPost
}

const CommentBox: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // If IntersectionObserver isn't supported, mount immediately on client
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true)
      return
    }

    const node = containerRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && (entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        root: null,
        rootMargin: "300px 0px",
        threshold: 0.01,
      }
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef}>
      {isVisible && (
        <>
          <SimpleComment slug={data.id} />
          {CONFIG.utterances.enable && (
            <UtterancesComponent issueTerm={data.id} />
          )}
        </>
      )}
    </div>
  )
}

export default CommentBox

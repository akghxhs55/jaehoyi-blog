import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ExtendedRecordMap } from "notion-types"
import useScheme from "src/hooks/useScheme"

// used for rendering equations (optional)
import { FC, useEffect, useRef } from "react"
import styled from "@emotion/styled"
import Prism from "prismjs/prism"

const _NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: false }
)

const Code = dynamic(() =>
  import("react-notion-x/build/third-party/code").then(async (m) => m.Code),
  { ssr: false }
)

const Collection = dynamic(
  () =>
    import("react-notion-x/build/third-party/collection").then(
      (m) => m.Collection
    ),
  { ssr: false }
)
const Equation = dynamic(
  () =>
    import("react-notion-x/build/third-party/equation").then((m) => m.Equation),
  { ssr: false }
)
const Pdf = dynamic(
  () => import("react-notion-x/build/third-party/pdf").then((m) => m.Pdf),
  {
    ssr: false,
  }
)
const Modal = dynamic(
  () => import("react-notion-x/build/third-party/modal").then((m) => m.Modal),
  {
    ssr: false,
  }
)

const mapPageUrl = (id: string) => {
  return "https://www.notion.so/" + id.replace(/-/g, "")
}

type Props = {
  recordMap: ExtendedRecordMap
}

const NotionRenderer: FC<Props> = ({ recordMap }) => {
  const [scheme] = useScheme()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    let observer: MutationObserver | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const isHighlighting = { current: false }

    const fixAndHighlight = () => {
      if (!root) return
      if (isHighlighting.current) return
      isHighlighting.current = true
      // Temporarily disconnect to avoid reacting to Prism's own DOM mutations
      if (observer) observer.disconnect()

      try {
        // General fix: normalize any Notion language class to Prism's expected id
        const ALIASES: Record<string, string> = {
          // C family
          'c#': 'csharp',
          'cs': 'csharp',
          'f#': 'fsharp',
          'fs': 'fsharp',
          'c++': 'cpp',
          'cplusplus': 'cpp',
          'obj-c': 'objectivec',
          'objective-c': 'objectivec',
          'objc': 'objectivec',
          // Web
          'html': 'markup',
          'xhtml': 'markup',
          'xml': 'markup',
          'svg': 'markup',
          'mathml': 'markup',
          'js': 'javascript',
          'jsx': 'jsx',
          'ts': 'typescript',
          'tsx': 'tsx',
          // Shells
          'shell': 'bash',
          'sh': 'bash',
          'zsh': 'bash',
          'console': 'bash',
          // Others common
          'py': 'python',
          'rb': 'ruby',
          'yml': 'yaml',
          'md': 'markdown',
          'ps': 'powershell',
          'ps1': 'powershell',
          'golang': 'go',
          'docker': 'docker',
          'dockerfile': 'docker',
        }

        const sanitize = (raw: string) => raw.toLowerCase().trim()
        const canonical = (raw: string) => {
          const s = sanitize(raw)
          if (ALIASES[s]) return ALIASES[s]
          // replace non-alphanumerics with nothing for lookup variants
          const compact = s.replace(/[^a-z0-9]+/g, '')
          if (ALIASES[compact]) return ALIASES[compact]
          // fallback: replace non-alphanumerics with dashes
          return s.replace(/[^a-z0-9]+/g, '-')
        }

        // Remove language-none which can interfere with Prism
        root.querySelectorAll<HTMLElement>('.language-none').forEach((node) => node.classList.remove('language-none'))

        // Normalize classes on paired pre/code elements
        const allBlocks = Array.from(root.querySelectorAll<HTMLElement>('pre, code'))
        allBlocks.forEach((el) => {
          // Skip already tokenized code blocks to reduce churn
          if (el.tagName.toLowerCase() === 'code' && el.querySelector('span.token')) return

          const classes = Array.from(el.classList)
          const langClass = classes.find((c) => c.startsWith('language-'))
          if (!langClass) return

          const rawId = langClass.slice('language-'.length)
          const id = canonical(rawId)
          const normalizedClass = `language-${id}`

          // If already normalized, do nothing
          if (langClass === normalizedClass && classes.filter((c) => c.startsWith('language-')).length === 1) return

          // Find pair (pre <-> code) to keep them in sync
          let pre: HTMLElement | null = null
          let code: HTMLElement | null = null
          if (el.tagName.toLowerCase() === 'pre') {
            pre = el
            code = el.querySelector('code')
          } else {
            code = el
            pre = el.closest('pre')
          }

          const targets = [el, pre, code].filter((n): n is HTMLElement => !!n)
          targets.forEach((node) => {
            // remove all language-* classes first
            Array.from(node.classList)
              .filter((c) => c.startsWith('language-'))
              .forEach((c) => node.classList.remove(c))
            node.classList.add(normalizedClass)
          })
        })

        // Run Prism highlighting under this container
        Prism.highlightAllUnder(root)
      } finally {
        isHighlighting.current = false
        // Reconnect the observer after DOM stabilization
        if (observer) {
          observer.observe(root, { childList: true, subtree: true })
        }
      }
    }

    // Initial run (after first render)
    fixAndHighlight()

    // Observe for dynamic content updates from react-notion-x
    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fixAndHighlight()
      }, 80)
    })
    observer.observe(root, { childList: true, subtree: true })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (observer) observer.disconnect()
    }
  }, [recordMap])

  return (
    <StyledWrapper ref={containerRef}>
      <_NotionRenderer
        darkMode={scheme === "dark"}
        recordMap={recordMap}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          nextImage: Image,
          nextLink: Link,
        }}
        mapPageUrl={mapPageUrl}
      />
    </StyledWrapper>
  )
}

export default NotionRenderer

const StyledWrapper = styled.div`
  /* // TODO: why render? */
  .notion-collection-page-properties {
    display: none !important;
  }
  .notion-page {
    padding: 0;
  }
  .notion-list {
    width: 100%;
  }

  /* Code block copy button sizing and layout */
  .notion-code {
    position: relative;
  }
  .notion-code pre {
    padding-right: 2.25rem !important; /* reserve space for smaller copy button */
    overflow-x: auto; /* only scroll when content actually overflows */
  }
  .notion-code .notion-code-copy,
  .notion-code .notion-code-copy-button {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  /* Icon size inside the button */
  .notion-code .notion-code-copy svg,
  .notion-code .notion-code-copy-button svg {
    width: 16px;
    height: 16px;
  }
`

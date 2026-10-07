import dynamic from "next/dynamic"
import Image from "next/image"
import type { ImageProps } from "next/image"
import Link from "next/link"
import { Block, ExtendedRecordMap } from "notion-types"
import { defaultMapImageUrl } from "notion-utils"
import useScheme from "src/hooks/useScheme"

// used for rendering equations (optional)
import { FC, useCallback, useEffect, useRef } from "react"
import styled from "@emotion/styled"
import Prism from "prismjs/prism"
import 'prismjs/components/prism-markup-templating.js'
import 'prismjs/components/prism-markup.js'
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-c.js'
import 'prismjs/components/prism-cpp.js'
import 'prismjs/components/prism-csharp.js'
import 'prismjs/components/prism-js-templates.js'
import 'prismjs/components/prism-kotlin.js'
import 'prismjs/components/prism-markdown.js'
import 'prismjs/components/prism-powershell.js'
import 'prismjs/components/prism-python.js'
import 'prismjs/components/prism-rust.js'

const _NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: true }
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

const NotionImage = ({ width, height, fill, ...props }: ImageProps) => {
  const src = typeof props.src === "string" ? props.src : ""
  const isAnimatedGif = src.toLowerCase().includes(".gif")
  const isNotionImageProxy = src.startsWith("/api/notion-image?")
  const alt = props.alt || ""

  if (!width || !height) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className={props.className}
        loading={props.loading === "eager" ? "eager" : "lazy"}
        onLoad={props.onLoad}
        src={src}
        style={props.style}
      />
    )
  }

  return (
    <Image
      {...props}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={props.sizes || "(max-width: 768px) calc(100vw - 2rem), 800px"}
      quality={props.quality || 75}
      unoptimized={props.unoptimized || isAnimatedGif || isNotionImageProxy}
    />
  )
}

type Props = {
  pageId: string
  recordMap: ExtendedRecordMap
}

const NotionRenderer: FC<Props> = ({ pageId, recordMap }) => {
  const [scheme] = useScheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapImageUrl = useCallback(
    (url: string | undefined, block: Block) => {
      const signedUrl = recordMap.signed_urls?.[block.id]
      const source = url?.startsWith("attachment:") ? url : undefined

      if (signedUrl || source) {
        const params = new URLSearchParams({
          pageId,
          blockId: block.id,
          ...(signedUrl && { signedUrl }),
          ...(source && { source }),
        })
        return `/api/notion-image?${params.toString()}`
      }

      return defaultMapImageUrl(url, block)
    },
    [pageId, recordMap]
  )

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    let observer: MutationObserver | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const isHighlighting = { current: false }

    const markScrollableCodeBlocks = () => {
      root.querySelectorAll<HTMLElement>('pre.notion-code').forEach((pre) => {
        const code = pre.querySelector<HTMLElement>(':scope > code')
        const hasHorizontalScroll = code ? code.scrollWidth > code.clientWidth : false

        pre.classList.toggle('has-horizontal-scroll', hasHorizontalScroll)
      })
    }

    const initializeSpoilers = () => {
      root
        .querySelectorAll<HTMLSpanElement>('span.notion-purple_background')
        .forEach((spoiler) => {
          if (spoiler.dataset.spoilerInitialized) return

          spoiler.dataset.spoilerInitialized = 'true'
          spoiler.classList.add('notion-spoiler')
          spoiler.tabIndex = 0
          spoiler.setAttribute('role', 'button')
          spoiler.setAttribute('aria-expanded', 'false')
          spoiler.setAttribute('aria-label', '스포일러 보기')

          const toggle = () => {
            const isRevealed = spoiler.classList.toggle('is-revealed')
            spoiler.setAttribute('aria-expanded', String(isRevealed))
            spoiler.setAttribute(
              'aria-label',
              isRevealed ? '스포일러 숨기기' : '스포일러 보기'
            )
          }

          spoiler.addEventListener('click', toggle)
          spoiler.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return

            event.preventDefault()
            toggle()
          })
        })
    }

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
          'pwsh': 'powershell',
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
        markScrollableCodeBlocks()
        initializeSpoilers()
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
    window.addEventListener('resize', markScrollableCodeBlocks)

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
      window.removeEventListener('resize', markScrollableCodeBlocks)
    }
  }, [recordMap])

  return (
    <StyledWrapper
      ref={containerRef}
      onClickCapture={(event) => {
        if (!(event.target instanceof Element)) return

        const button = event.target.closest<HTMLElement>('.notion-code-copy-button')
        if (button) button.dataset.copied = 'true'
      }}
      onTransitionEndCapture={(event) => {
        if (!(event.target instanceof HTMLElement)) return
        if (event.propertyName !== 'opacity') return
        if (!event.target.matches('.notion-code-copy')) return
        if (event.target.closest('.notion-code')?.matches(':hover')) return
        if (window.getComputedStyle(event.target).opacity !== '0') return

        const button = event.target.querySelector<HTMLElement>('.notion-code-copy-button')
        if (button) delete button.dataset.copied
      }}
    >
      <_NotionRenderer
        darkMode={scheme === "dark"}
        recordMap={recordMap}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          nextImage: NotionImage,
          nextLink: Link,
        }}
        mapImageUrl={mapImageUrl}
        mapPageUrl={mapPageUrl}
        forceCustomImages
      />
    </StyledWrapper>
  )
}

export default NotionRenderer

const StyledWrapper = styled.div`
  /* Normalize Notion base size to follow our root rem scale */
  .notion {
    font-size: 1rem !important; /* 15px desktop, 14px mobile via html rem */
    line-height: 1.72;
  }

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
  .notion-list-disc li {
    padding-top: 1px;
    padding-bottom: 1px;
  }

  /* Keep inline formatting authored in Notion visually distinct from body text. */
  .notion b,
  .notion strong {
    font-weight: 700;
  }
  .notion em,
  .notion i {
    font-style: italic;
  }
  .notion s,
  .notion del {
    text-decoration: line-through;
  }
  .notion .notion-inline-underscore,
  .notion u {
    text-decoration: underline;
  }

  /*
   * Notion convention: purple text background means spoiler.
   * Hover reveals it temporarily; click, Enter, or Space keeps it revealed.
   */
  span.notion-purple_background.notion-spoiler {
    cursor: pointer;
    background-color: rgba(148, 163, 184, 0.26) !important;
    border-radius: 0.2em;
    color: rgba(100, 116, 139, 0.72) !important;
    filter: blur(0.22em);
    user-select: none;
    transition: background-color 160ms ease, color 160ms ease, filter 160ms ease;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  span.notion-purple_background.notion-spoiler * {
    color: inherit !important;
  }
  span.notion-purple_background.notion-spoiler:hover,
  span.notion-purple_background.notion-spoiler:focus-visible,
  span.notion-purple_background.notion-spoiler.is-revealed {
    background-color: transparent !important;
    color: inherit !important;
    filter: none;
    user-select: text;
  }
  span.notion-purple_background.notion-spoiler:hover *,
  span.notion-purple_background.notion-spoiler:focus-visible *,
  span.notion-purple_background.notion-spoiler.is-revealed * {
    color: inherit !important;
  }
  span.notion-purple_background.notion-spoiler:focus-visible {
    outline: 2px solid rgba(100, 116, 139, 0.8);
    outline-offset: 2px;
  }

  /*
   * Notion can leave block_page_width enabled on images moved into columns.
   * react-notion-x then combines the narrow column width with the image's
   * original fixed height and object-fit: cover, which crops the image.
   */
  .notion-column .notion-asset-wrapper-image > div {
    height: auto !important;
  }
  .notion-column .notion-asset-wrapper-image img {
    height: auto;
    object-fit: contain !important;
  }

  /* Code block copy button sizing and layout */
  .notion-code {
    position: relative;
    overflow: visible;
  }
  .notion-code.has-horizontal-scroll {
    padding-bottom: 0.55em;
  }
  .notion-code.has-horizontal-scroll > code {
    padding-bottom: 0.35em;
  }
  .notion-code > code {
    display: block;
    max-width: 100%;
    padding-right: 1.75rem; /* reserve space under the floating copy button */
    overflow-x: auto; /* keep horizontal scrolling separate from the floating button */
    scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
    scrollbar-width: thin;
  }
  .notion-code > code::-webkit-scrollbar {
    height: 6px;
  }
  .notion-code > code::-webkit-scrollbar-track {
    background: transparent;
  }
  .notion-code > code::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.38);
    border-radius: 999px;
  }
  .notion-code > code::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.62);
  }
  .notion-code .notion-code-copy,
  .notion-code .notion-code-copy-button {
    position: absolute;
    top: 4px;
    right: 4px;
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
    width: 13px;
    height: 13px;
  }
  .notion-code .notion-code-copy-button[data-copied="true"] svg {
    display: none;
  }
  .notion-code .notion-code-copy-button[data-copied="true"]::after {
    content: "";
    width: 5px;
    height: 9px;
    border: solid currentColor;
    border-width: 0 2px 2px 0;
    transform: translateY(-2px) rotate(45deg);
  }
  .notion-code .notion-code-copy-tooltip {
    display: none;
  }
`

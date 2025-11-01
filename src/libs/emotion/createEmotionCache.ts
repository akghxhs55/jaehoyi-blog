import createCache from "@emotion/cache"

// Create a custom Emotion cache with a predictable key and optional insertion point.
// This helps keep class name generation deterministic between SSR and CSR.
export default function createEmotionCache() {
  let insertionPoint: HTMLElement | undefined

  if (typeof document !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="emotion-insertion-point"]'
    )
    insertionPoint = meta ?? undefined
  }

  return createCache({ key: "css", insertionPoint: insertionPoint as any })
}

import { AppPropsWithLayout } from "../types"
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query"
import { RootLayout } from "src/layouts"
import { queryClient } from "src/libs/react-query"
import Head from "next/head"
import { CONFIG } from "site.config"

import Router from "next/router"
import NProgress from "nprogress"
import "nprogress/nprogress.css"
import "katex/dist/katex.min.css"

// Emotion SSR: provide cache to keep classNames stable across SSR/CSR
import { CacheProvider, EmotionCache } from "@emotion/react"
import createEmotionCache from "src/libs/emotion/createEmotionCache"

// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css"

// used for code syntax highlighting (optional)
import "prismjs/themes/prism-tomorrow.css"

Router.events.on("routeChangeStart", () => NProgress.start())
Router.events.on("routeChangeComplete", () => NProgress.done())
Router.events.on("routeChangeError", () => NProgress.done())

// Client-side Emotion cache (reused across navigations)
const clientSideEmotionCache = createEmotionCache()

type MyAppProps = AppPropsWithLayout & { emotionCache?: EmotionCache }

function App({ Component, pageProps, emotionCache = clientSideEmotionCache }: MyAppProps) {
  const getLayout = Component.getLayout || ((page) => page)

  return (
    <CacheProvider value={emotionCache}>
      <QueryClientProvider client={queryClient}>
        <Head>
          <title>{CONFIG.blog.title}</title>
          <meta name="description" content={CONFIG.blog.description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <HydrationBoundary state={pageProps.dehydratedState}>
          <RootLayout>{getLayout(<Component {...pageProps} />)}</RootLayout>
        </HydrationBoundary>
      </QueryClientProvider>
    </CacheProvider>
  )
}

export default App
import { AppPropsWithLayout } from "../types"
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query"
import { RootLayout } from "src/layouts"
import { queryClient } from "src/libs/react-query"
import Head from "next/head" // 1. next/head에서 Head를 가져옵니다.
import { CONFIG } from "site.config" // 2. 설정 파일 경로 (기존에 있다면 유지)

import Router from "next/router"
import NProgress from "nprogress"
import "nprogress/nprogress.css"
import "katex/dist/katex.min.css"

// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css"

// used for code syntax highlighting (optional)
import "prismjs/themes/prism-tomorrow.css"

Router.events.on("routeChangeStart", () => NProgress.start())
Router.events.on("routeChangeComplete", () => NProgress.done())
Router.events.on("routeChangeError", () => NProgress.done())

function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout || ((page) => page)

  return (
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
  )
}

export default App
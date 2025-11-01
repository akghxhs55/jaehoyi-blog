import Document, { Html, Head, Main, NextScript, DocumentContext } from "next/document"
import { CONFIG } from "site.config"
import createEmotionServer from "@emotion/server/create-instance"
import createEmotionCache from "src/libs/emotion/createEmotionCache"

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const originalRenderPage = ctx.renderPage

    const cache = createEmotionCache()
    const { extractCriticalToChunks } = createEmotionServer(cache as any)

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App: any) => (props) => <App emotionCache={cache as any} {...props} />,
      })

    const initialProps = await Document.getInitialProps(ctx)

    // Extract critical CSS and append to initial props
    const emotionStyles = extractCriticalToChunks(initialProps.html)
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        data-emotion={`${style.key} ${style.ids.join(" ")}`}
        key={style.key}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ))

    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          {emotionStyleTags}
        </>
      ),
    }
  }

  render() {
    return (
      <Html lang={CONFIG.lang}>
        <Head>
          {/* Emotion insertion point to ensure styles are injected in the right order */}
          <meta name="emotion-insertion-point" content="" />

          <link rel="icon" href="/favicon.ico" />
          <link
            rel="apple-touch-icon"
            sizes="192x192"
            href="/apple-touch-icon.png"
          ></link>
          <link
            rel="alternate"
            type="application/rss+xml"
            title="RSS 2.0"
            href="/feed.xml"
          ></link>
          {/* google search console */}
          {CONFIG.googleSearchConsole.enable && (
            <>
              <meta
                name="google-site-verification"
                content={CONFIG.googleSearchConsole.config.siteVerification}
              />
            </>
          )}
          {/* naver search advisor */}
          {CONFIG.naverSearchAdvisor.enable && (
            <>
              <meta
                name="naver-site-verification"
                content={CONFIG.naverSearchAdvisor.config.siteVerification}
              />
            </>
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument

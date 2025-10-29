import { CONFIG } from "site.config"
import Head from "next/head"

export type MetaConfigProps = {
  title: string
  description: string
  type: "Website" | "Post" | "Page" | string
  date?: string
  image?: string
  url: string
}


const ensureAbsoluteUrl = (pathOrUrl?: string) => {
  if (!pathOrUrl) return undefined
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = CONFIG.link?.replace(/\/$/, "") || ""
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

const buildJsonLd = (props: MetaConfigProps) => {
  const lang = CONFIG.lang || "ko-KR"
  const siteUrl = (CONFIG.link || props.url).replace(/\/$/, "")
  const publisherLogo = ensureAbsoluteUrl(CONFIG.profile.image)
  const publisher: any = {
    "@type": "Organization",
    name: CONFIG.profile.name,
    url: siteUrl,
    ...(publisherLogo ? { logo: { "@type": "ImageObject", url: publisherLogo } } : {}),
  }

  const typeLower = (props.type || "").toLowerCase()

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: CONFIG.blog.title || CONFIG.profile.name,
    alternateName: CONFIG.blog.title !== CONFIG.profile.name ? CONFIG.profile.name : undefined,
    url: `${siteUrl}/`,
    inLanguage: lang,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    publisher,
  }

  // BlogPosting for Post/Paper
  if (typeLower === "post" || typeLower === "paper") {
    const imageUrl = ensureAbsoluteUrl(props.image)
    const blogPosting = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: props.title,
      description: props.description,
      url: props.url,
      mainEntityOfPage: props.url,
      inLanguage: lang,
      author: { "@type": "Person", name: CONFIG.profile.name },
      publisher,
      datePublished: props.date,
      dateModified: props.date,
      ...(imageUrl ? { image: [imageUrl] } : {}),
    }

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: props.title, item: props.url },
      ],
    }

    return [websiteSchema, blogPosting, breadcrumb]
  }

  // WebPage for Page/others
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: props.title,
    description: props.description,
    url: props.url,
    inLanguage: lang,
    isPartOf: { "@type": "WebSite", url: `${siteUrl}/`, name: CONFIG.blog.title || CONFIG.profile.name },
    datePublished: props.date,
    dateModified: props.date,
    publisher,
  }

  // If explicitly website
  if (typeLower === "website") {
    return websiteSchema
  }

  // Default include both WebSite and WebPage to give context
  return [websiteSchema, webPage]
}

const MetaConfig: React.FC<MetaConfigProps> = (props) => {
  const jsonLd = buildJsonLd(props)
  return (
    <Head>
      <title>{props.title}</title>
      <meta name="robots" content="follow, index" />
      <meta charSet="UTF-8" />
      <meta name="description" content={props.description} />
      <link rel="canonical" href={props.url} />
      {/* og */}
      <meta property="og:type" content={props.type} />
      <meta property="og:title" content={props.title} />
      <meta property="og:site_name" content={CONFIG.profile.name} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={props.url} />
      <meta property="og:updated_time" content={props.date} />
      {CONFIG.lang && <meta property="og:locale" content={CONFIG.lang} />}
      {props.image && <meta property="og:image" content={props.image} />}
      {/* twitter */}
      <meta name="twitter:title" content={props.title} />
      <meta name="twitter:description" content={props.description} />
      <meta name="twitter:card" content="summary_large_image" />
      {props.image && <meta name="twitter:image" content={props.image} />}
      {/* post */}
      {(props.type === "Post" || props.type === "Paper") && (
        <>
          <meta property="article:published_time" content={props.date} />
          <meta property="article:author" content={CONFIG.profile.name} />
        </>
      )}
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </Head>
  )
}

export default MetaConfig

import fs from 'fs';
import path from 'path';
import RSS from 'rss';
import { getPosts } from "src/apis/notion-client/getPosts";
import { filterPosts } from "src/libs/utils/notion";
import { CONFIG } from "../site.config.js";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function createSitemapXml(posts: ReturnType<typeof filterPosts>) {
  const latest =
    posts[0]?.date?.start_date || posts[0]?.createdTime || Date.now()

  const urls: {
    loc: string
    lastmod: string
    changefreq: string
    priority: string
  }[] = [
    {
      loc: CONFIG.link,
      lastmod: new Date(latest).toISOString(),
      changefreq: "daily",
      priority: "1.0",
    },
  ]

  const postsPerPage = CONFIG.postsPerPage || 10
  const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage))
  const pageCap = Math.min(5, totalPages)
  for (let page = 1; page <= pageCap; page++) {
    urls.push({
      loc: `${CONFIG.link}/page/${page}`,
      lastmod: new Date(latest).toISOString(),
      changefreq: "daily",
      priority: "0.6",
    })
  }

  const tagCount: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}

  for (const post of posts) {
    for (const tag of post.tags || []) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }

    const category = Array.isArray(post.category)
      ? post.category[0]
      : post.category
    if (category) {
      categoryCount[category] = (categoryCount[category] || 0) + 1
    }
  }

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tag]) => tag)
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([category]) => category)

  for (const tag of topTags) {
    urls.push({
      loc: `${CONFIG.link}/tag/${encodeURIComponent(tag)}`,
      lastmod: new Date(latest).toISOString(),
      changefreq: "daily",
      priority: "0.5",
    })
  }

  for (const category of topCategories) {
    urls.push({
      loc: `${CONFIG.link}/category/${encodeURIComponent(category)}`,
      lastmod: new Date(latest).toISOString(),
      changefreq: "daily",
      priority: "0.5",
    })
  }

  for (const post of posts) {
    const date = post.date?.start_date || post.createdTime || Date.now()
    urls.push({
      loc: encodeURI(`${CONFIG.link}/${post.slug}`),
      lastmod: new Date(date).toISOString(),
      changefreq: "daily",
      priority: "0.7",
    })
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (url) =>
          `\n  <url>` +
          `\n    <loc>${escapeXml(url.loc)}</loc>` +
          `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` +
          `\n    <changefreq>${url.changefreq}</changefreq>` +
          `\n    <priority>${url.priority}</priority>` +
          `\n  </url>`
      )
      .join("") +
    `\n</urlset>`
  )
}

async function generateRssFeed() {
  const posts = filterPosts(await getPosts());

  const feed = new RSS({
    title: CONFIG.blog.title,
    description: CONFIG.blog.description,
    site_url: CONFIG.link,
    feed_url: `${CONFIG.link}/feed.xml`,
    language: CONFIG.lang,
    pubDate: new Date(),
  });

  posts.forEach((post) => {
    const url = `${CONFIG.link}/${encodeURIComponent(post.slug)}`;

    feed.item({
      title: post.title,
      description: post.summary || CONFIG.blog.description,
      url: url,
      guid: url,
      date: new Date(post.date?.start_date || post.createdTime),
      author: CONFIG.profile.name,
    });
  });

  const rss = feed.xml({ indent: true });

  fs.writeFileSync(path.resolve("./public/feed.xml"), rss);
  fs.writeFileSync(path.resolve("./public/sitemap.xml"), createSitemapXml(posts));
}

generateRssFeed();

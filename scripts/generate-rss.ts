import fs from 'fs';
import path from 'path';
import RSS from 'rss';
import { getPosts } from "src/apis/notion-client/getPosts";
import { filterPosts } from "src/libs/utils/notion";
import { CONFIG } from "../site.config.js";

async function generateRssFeed() {
  const feed = new RSS({
    title: CONFIG.blog.title,
    description: CONFIG.blog.description,
    site_url: CONFIG.link,
    feed_url: `${CONFIG.link}/feed.xml`,
    language: CONFIG.lang,
    pubDate: new Date(),
  });

  const posts = filterPosts(await getPosts());

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
}

generateRssFeed();

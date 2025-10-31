module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.notion.so",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "lh5.googleusercontent.com",
      },
    ],
  },
  // Ensure Notion-related ESM/CJS packages are bundled for SSR on Vercel
  // to avoid "Failed to load external module ... notion-client/notion-utils" errors.
  transpilePackages: [
    "notion-client",
    "notion-utils",
    "notion-types",
    "react-notion-x",
  ],
  async redirects() {
    return [
      // /?tag=foo -> /tag/foo
      {
        source: '/',
        has: [{ type: 'query', key: 'tag' }],
        permanent: true,
        destination: '/tag/:tag',
      },
      // /?category=bar -> /category/bar
      {
        source: '/',
        has: [{ type: 'query', key: 'category' }],
        permanent: true,
        destination: '/category/:category',
      },
      // /?page=2 -> /page/2
      {
        source: '/',
        has: [{ type: 'query', key: 'page' }],
        permanent: true,
        destination: '/page/:page',
      },
    ]
  },
};

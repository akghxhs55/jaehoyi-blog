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
};

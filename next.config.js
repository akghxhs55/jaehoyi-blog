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
  serverExternalPackages: [
    "notion-client",
    "notion-types",
    "notion-utils",
  ],
};

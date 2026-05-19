/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages 静态导出
  output: "export",
  trailingSlash: true,
  // 如果部署在子路径（如 username.github.io/resume-analyzer）则取消注释：
  // basePath: '/resume-analyzer',
  // assetPrefix: '/resume-analyzer/',
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

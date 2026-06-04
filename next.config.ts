import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta el servidor con solo lo necesario en .next/standalone,
  // para poder ejecutarlo sin 'npm install' (entrega de un clic).
  output: 'standalone',
};

export default nextConfig;

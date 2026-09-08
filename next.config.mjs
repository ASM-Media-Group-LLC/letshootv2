/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@paper-design/shaders-react', '@paper-design/shaders'],
  async redirects() {
    return [
      // El wizard se movió a /propuestas (URL corta para el equipo);
      // se mantiene el redirect para links viejos ya compartidos.
      { source: '/admin/propuestas', destination: '/propuestas', permanent: false },
    ];
  },
};

export default nextConfig;

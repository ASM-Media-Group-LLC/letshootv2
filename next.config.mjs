/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@paper-design/shaders-react', '@paper-design/shaders'],
  async redirects() {
    return [
      // El wizard se movió a /propuestas (URL corta para el equipo);
      // se mantiene el redirect para links viejos ya compartidos.
      { source: '/admin/propuestas', destination: '/propuestas', permanent: false },
      // La ruta real es /conexion (sin tilde). Si alguien escribe /conexión
      // (con tilde) que no dé 404: lo mandamos a la buena.
      { source: '/conexión', destination: '/conexion', permanent: false },
      { source: '/conexi%C3%B3n', destination: '/conexion', permanent: false },
    ];
  },
};

export default nextConfig;

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gulas KDS',
    short_name: 'Gulas KDS',
    description: 'Kitchen Display System do Gulas',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#35271F',
    theme_color: '#35271F',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

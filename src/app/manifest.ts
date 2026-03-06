// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
      name: 'ConsistentProp Betting',
          short_name: 'Consistent',
              description: 'Prop Consistency & Hit-Rate Analytics',
                  start_url: '/',
                      display: 'standalone', // Removes the browser address bar
                          background_color: '#000000',
                              theme_color: '#000000',
                                  icons: [
                                        {
                                                src: '/icon-192x192.png',
                                                        sizes: '192x192',
                                                                type: 'image/png',
                                                                      },
                                                                            {
                                                                                    src: '/icon-512x512.png',
                                                                                            sizes: '512x512',
                                                                                                    type: 'image/png',
                                                                                                          },
                                                                                                              ],
                                                                                                                }
                                                                                                                }
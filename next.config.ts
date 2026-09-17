import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

// Menggunakan sintaks fungsi bawaan dari library
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  // Pindahkan skipWaiting ke dalam objek workboxOptions
  workboxOptions: {
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.130.204', '192.168.3.1'],
   turbopack: {}, 

};

export default withPWA(nextConfig);

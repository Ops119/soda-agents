import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soda.agents",
    short_name: "Soda",
    description: "USDC access to Solana agents on devnet.",
    start_url: "/",
    display: "standalone",
    background_color: "#07110d",
    theme_color: "#07110d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

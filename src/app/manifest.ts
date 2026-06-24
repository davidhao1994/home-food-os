import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Food OS",
    short_name: "FoodOS",
    description: "Household inventory, shopping, meals, and nutrition platform",
    start_url: "/dashboard",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f5f1",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml"
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Inventory",
        short_name: "Inventory",
        url: "/inventory"
      },
      {
        name: "Shopping",
        short_name: "Shopping",
        url: "/shopping"
      }
    ]
  };
}

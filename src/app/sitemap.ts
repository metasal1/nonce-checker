import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://noncechecker.metasal.xyz",
      lastModified: new Date(),
    },
  ];
}

import { FC, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  structuredData?: object | object[]; // JSON-LD structured data
}

const SEO: FC<SEOProps> = ({
  title,
  description,
  image,
  type = "website",
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  structuredData,
}) => {
  const location = useLocation();
  const baseUrl = "https://jsquaredadventures.com";

  // Default values
  const defaultTitle = "J²Adventures - Exploring the world, one adventure at a time";
  const defaultDescription = "Join us on our adventures around the world! From hiking and camping to food tours and city explorations, we share our travel stories and experiences.";
  const defaultImage = `${baseUrl}/og-image.jpg`; // You'll need to create this

  // Memoize computed values to prevent unnecessary recalculations
  const finalTitle = useMemo(() => title ? `${title} | J²Adventures` : defaultTitle, [title]);
  const finalDescription = useMemo(() => description || defaultDescription, [description]);
  const finalImage = useMemo(() => image || defaultImage, [image, defaultImage]);
  const canonicalUrl = useMemo(() => `${baseUrl}${location.pathname}`, [location.pathname]);

  // Memoize structured data JSON strings to prevent unnecessary updates
  const structuredDataJSON = useMemo(() => {
    if (!structuredData) return null;
    const dataArray = Array.isArray(structuredData) ? structuredData : [structuredData];
    return dataArray.map(data => JSON.stringify(data));
  }, [structuredData]);

  useEffect(() => {
    // Update document title
    document.title = finalTitle;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, property);
        document.head.appendChild(element);
      }

      element.content = content;
    };

    // Standard meta tags
    updateMetaTag("description", finalDescription);
    updateMetaTag("author", author || "J²Adventures");

    // Open Graph tags
    updateMetaTag("og:title", finalTitle, true);
    updateMetaTag("og:description", finalDescription, true);
    updateMetaTag("og:image", finalImage, true);
    updateMetaTag("og:url", canonicalUrl, true);
    updateMetaTag("og:type", type, true);
    updateMetaTag("og:site_name", "J²Adventures", true);

    // Article-specific tags
    if (type === "article") {
      if (publishedTime) {
        updateMetaTag("article:published_time", publishedTime, true);
      }
      if (modifiedTime) {
        updateMetaTag("article:modified_time", modifiedTime, true);
      }
      if (author) {
        updateMetaTag("article:author", author, true);
      }
      if (section) {
        updateMetaTag("article:section", section, true);
      }
      if (tags && tags.length > 0) {
        // Remove existing tag meta elements
        document.querySelectorAll('meta[property="article:tag"]').forEach(el => el.remove());
        // Add new ones
        tags.forEach(tag => {
          const tagMeta = document.createElement("meta");
          tagMeta.setAttribute("property", "article:tag");
          tagMeta.content = tag;
          document.head.appendChild(tagMeta);
        });
      }
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", finalTitle);
    updateMetaTag("twitter:description", finalDescription);
    updateMetaTag("twitter:image", finalImage);

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Add JSON-LD structured data (only update if changed)
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    if (structuredDataJSON) {
      structuredDataJSON.forEach(jsonString => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = jsonString;
        document.head.appendChild(script);
      });
    }

  }, [finalTitle, finalDescription, finalImage, canonicalUrl, type, author, publishedTime, modifiedTime, section, tags, structuredDataJSON]);

  return null; // This component doesn't render anything
};

export default SEO;

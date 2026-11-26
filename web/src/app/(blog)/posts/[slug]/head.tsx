import { htmlToPlainText } from "@/lib/content";
import { cdnImageUrl } from "@/lib/cloudinary/transform";
import {
  getCanonicalPostUrl,
  getCategoryHref,
  SITE_URL,
  slugify,
} from "@/lib/utils";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getPublishedPostBySlug } from "@/server/queries/posts";

import { normalizePostSlug } from "./slug";

type PostHeadProps = {
  params: Promise<{ slug: string }>;
};

function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function Head({ params }: PostHeadProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizePostSlug(rawSlug);

  if (!slug) {
    return null;
  }

  const post = await getPublishedPostBySlug(slug);

  if (!post || post.status !== "published") {
    return null;
  }

  const authorProfile = post.authorId
    ? await getPublicAuthorProfileById(post.authorId)
    : null;
  const canonicalUrl = getCanonicalPostUrl(post);
  const articlePublishedAt = post.publishedAt ?? post.createdAt;
  const articleModifiedAt = post.updatedAt ?? articlePublishedAt;
  const imageUrls = [
    post.imageUrl,
    ...post.images.map((image) => image.imageUrl),
  ]
    .map((value) => cdnImageUrl(value))
    .filter((value): value is string => Boolean(value));
  const authorUrl = post.authorId
    ? `${SITE_URL}/author/${encodeURIComponent(post.authorId)}`
    : undefined;
  const keywords = post.tags.map((tag) => tag.name).join(", ");

  const breadcrumbItems = [
    {
      "@type": "ListItem" as const,
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    ...(post.category
      ? [
          {
            "@type": "ListItem" as const,
            position: 2,
            name: post.category,
            item: `${SITE_URL}${getCategoryHref(slugify(post.category))}`,
          },
        ]
      : []),
    {
      "@type": "ListItem" as const,
      position: post.category ? 3 : 2,
      name: post.title,
      item: canonicalUrl,
    },
  ];

  const blogPosting = {
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline: post.title,
    description: htmlToPlainText(post.excerpt ?? post.description).slice(
      0,
      160,
    ),
    inLanguage: "en",
    datePublished: articlePublishedAt,
    dateModified: articleModifiedAt,
    author: {
      "@type": "Person",
      name: authorProfile?.displayName ?? "J²Adventures",
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    image: imageUrls.length > 0 ? imageUrls : undefined,
    url: canonicalUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    articleSection: post.category ?? undefined,
    keywords: keywords || undefined,
    publisher: {
      "@type": "Organization",
      name: "J²Adventures",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
      },
    },
  };

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  const jsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@graph": [blogPosting, breadcrumbs],
  });

  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml -- Standard JSON-LD injection pattern. jsonLd is produced by serializeJsonLd() which calls JSON.stringify() (escapes all special chars) then replaces < with \u003c to prevent </script> injection. Content is admin-only structured data, not user input.
  return (
    <script
      dangerouslySetInnerHTML={{ __html: jsonLd }}
      type="application/ld+json"
    />
  );
}

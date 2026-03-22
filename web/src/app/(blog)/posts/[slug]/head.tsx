import { htmlToPlainText } from "@/lib/content";
import { getCanonicalPostUrl } from "@/lib/utils";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getPublishedPostBySlug } from "@/server/queries/posts";

type PostHeadProps = {
  params: Promise<{ slug: string }>;
};

function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function Head({ params }: PostHeadProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post || post.status !== "published") {
    return null;
  }

  const authorProfile = post.authorId ? await getPublicAuthorProfileById(post.authorId) : null;
  const canonicalUrl = getCanonicalPostUrl(post);
  const articlePublishedAt = post.publishedAt ?? post.createdAt;
  const articleModifiedAt = post.updatedAt ?? articlePublishedAt;
  const imageUrls = [post.imageUrl, ...post.images.map((image) => image.imageUrl)].filter(
    (value): value is string => Boolean(value),
  );
  const jsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: htmlToPlainText(post.excerpt ?? post.description).slice(0, 160),
    datePublished: articlePublishedAt,
    dateModified: articleModifiedAt,
    author: {
      "@type": "Person",
      name: authorProfile?.displayName ?? "J²Adventures",
    },
    image: imageUrls.length > 0 ? imageUrls : undefined,
    url: canonicalUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "J²Adventures",
    },
  });

  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml -- Standard JSON-LD injection pattern. jsonLd is produced by serializeJsonLd() which calls JSON.stringify() (escapes all special chars) then replaces < with \u003c to prevent </script> injection. Content is admin-only structured data, not user input.
  return <script dangerouslySetInnerHTML={{ __html: jsonLd }} type="application/ld+json" />;
}

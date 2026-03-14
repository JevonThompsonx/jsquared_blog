import { getEditableHtmlFromContent } from "@/lib/content";
import type { AdminCategoryRecord, AdminEditablePostRecord } from "@/server/dal/admin-posts";
import { PostRichTextEditor } from "@/components/admin/post-rich-text-editor";
import { PostMediaManager } from "@/components/admin/post-media-manager";

export function PostEditorForm({
  mode,
  categories,
  post,
  action,
}: {
  mode: "create" | "edit";
  categories: AdminCategoryRecord[];
  post?: AdminEditablePostRecord | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const buttonLabel = mode === "create" ? "Create post" : "Save changes";
  const modeLabel = mode === "create" ? "New story" : "Editing story";
  const scheduledValue = post?.scheduledPublishTime
    ? new Date(post.scheduledPublishTime).toISOString().slice(0, 16)
    : "";
  const tagValue = post?.tags.map((tag) => tag.name).join(", ") ?? "";
  const tagCount = post?.tags.length ?? 0;
  const galleryCount = post?.galleryImages.length ?? 0;
  const galleryEntriesValue = JSON.stringify(
    post?.galleryImages.map((image) => ({
      imageUrl: image.imageUrl,
      altText: image.altText ?? "",
      focalX: image.focalX ?? 50,
      focalY: image.focalY ?? 50,
    })) ?? [],
  );

  return (
    <form action={action} className="space-y-8">
      <div className="sticky top-24 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 shadow-lg sm:px-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Editor actions</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Save often, review your schedule, and make sure every uploaded image has strong alt text.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{modeLabel}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{post?.status ?? "draft"}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{tagCount} tag{tagCount === 1 ? "" : "s"}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{galleryCount} gallery image{galleryCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          {post?.slug ? (
            <a className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] sm:text-left" href={`/posts/${post.slug}`}>
              Preview live post
            </a>
          ) : null}
          <button className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--primary-light)]" type="submit">
            {buttonLabel}
          </button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Core details</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{mode === "create" ? "Create a new post" : "Edit post"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">Shape the story first, then refine the supporting details. A strong title, clean excerpt, and clear structure do most of the work.</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Title</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.title ?? ""} name="title" required />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Keep it specific and place-led so readers immediately know what kind of adventure they are opening.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Slug</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.slug ?? ""} name="slug" placeholder="auto-generated-from-title" />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Leave this blank to auto-generate it, or set a clean URL if the story needs a shorter path.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Excerpt</span>
            <textarea className="mt-1 block min-h-28 w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.excerpt ?? ""} maxLength={280} name="excerpt" />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">This powers cards, previews, and search context. Aim for one vivid sentence rather than a paragraph.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Tags</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={tagValue} name="tagNames" placeholder="hiking, camping, waterfalls" />
            <span className="mt-2 block text-xs text-[var(--text-secondary)]">Use a few discovery-friendly tags that reflect place, activity, or season.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Story body</span>
            <PostRichTextEditor content={getEditableHtmlFromContent(post?.contentJson ?? "<p></p>")} inputName="contentHtml" />
          </label>
        </div>

        <div className="space-y-6">
            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Publishing</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Decide whether the post should go live immediately, stay in progress, or wait for a future release window.</p>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Status</span>
                <select className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.status ?? "draft"} name="status">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Scheduled publish time</span>
                <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={scheduledValue} name="scheduledPublishTime" type="datetime-local" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Layout</span>
                <select className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.layoutType ?? "standard"} name="layoutType">
                  <option value="standard">Standard</option>
                  <option value="split-horizontal">Split horizontal</option>
                  <option value="split-vertical">Split vertical</option>
                  <option value="hover">Hover</option>
                </select>
              </label>
            </div>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Categorization</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Use a category that helps readers browse by trip type, then support it with tags for the finer details.</p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Category</span>
              <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.category ?? ""} list="admin-categories" name="categoryName" placeholder="Start typing a category" />
              <datalist id="admin-categories">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>
            </label>
          </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Media</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">Lead with one memorable image, then curate a smaller supporting gallery that moves with the story instead of repeating it.</p>
            <div className="mt-5">
              <PostMediaManager
                initialFeaturedImageAlt={post?.featuredImageAlt ?? ""}
                initialFeaturedImageUrl={post?.imageUrl ?? ""}
                initialGalleryEntries={galleryEntriesValue}
              />
            </div>
          </section>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
            Publishing checklist: title, slug, excerpt, featured image, alt text, category, tags, body content, and either a publish date or scheduled time.
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-5 text-sm text-[var(--text-secondary)] shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Story quality pass</p>
            <ul className="mt-4 space-y-2 leading-7">
              <li>Open with a concrete scene so the story feels grounded immediately.</li>
              <li>Use subheads to break up longer sections and help scanning on mobile.</li>
              <li>Make sure every image adds something new rather than repeating the same viewpoint.</li>
            </ul>
          </div>
        </div>
      </section>
    </form>
  );
}

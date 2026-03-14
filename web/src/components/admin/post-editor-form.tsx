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
  const scheduledValue = post?.scheduledPublishTime
    ? new Date(post.scheduledPublishTime).toISOString().slice(0, 16)
    : "";
  const tagValue = post?.tags.map((tag) => tag.name).join(", ") ?? "";
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
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Core details</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{mode === "create" ? "Create a new post" : "Edit post"}</h2>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Title</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.title ?? ""} name="title" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Slug</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.slug ?? ""} name="slug" placeholder="auto-generated-from-title" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Excerpt</span>
            <textarea className="mt-1 block min-h-28 w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={post?.excerpt ?? ""} maxLength={280} name="excerpt" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Tags</span>
            <input className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text-primary)] shadow-sm focus:border-[var(--primary)] focus:ring focus:ring-[var(--primary)] focus:ring-opacity-50" defaultValue={tagValue} name="tagNames" placeholder="hiking, camping, waterfalls" />
          </label>

          <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Content HTML</span>
              <PostRichTextEditor content={getEditableHtmlFromContent(post?.contentJson ?? "<p></p>")} inputName="contentHtml" />
            </label>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Publishing</p>

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

          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Categorization</p>
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

          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Media</p>
            <div className="mt-5">
              <PostMediaManager
                initialFeaturedImageAlt={post?.featuredImageAlt ?? ""}
                initialFeaturedImageUrl={post?.imageUrl ?? ""}
                initialGalleryEntries={galleryEntriesValue}
              />
            </div>
          </section>

          <button className="w-full rounded-lg bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-[var(--primary-light)]" type="submit">
            {buttonLabel}
          </button>
        </div>
      </section>
    </form>
  );
}

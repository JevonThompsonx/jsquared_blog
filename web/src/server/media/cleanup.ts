import "server-only";

import { getDbClient } from "@/lib/db";
import { deleteLocalMedia } from "@/lib/media/local-storage";

/**
 * Delete a local file only when nothing still references it.
 *
 * `media_assets` rows are not the whole story: prose images live only in
 * `posts.content_json` / `posts.content_html`, avatars in `profiles`, and
 * wishlist art in `wishlist_places`. Content-addressed storage makes collisions
 * between those surfaces routine, so every reference is checked before unlink.
 */
export async function deleteLocalMediaIfUnreferenced(
  publicId: string,
): Promise<void> {
  const result = await getDbClient().execute({
    sql: `SELECT
      (SELECT COUNT(*) FROM media_assets WHERE provider = 'local' AND public_id = ?) +
      (SELECT COUNT(*) FROM posts WHERE instr(content_json, ?) > 0 OR instr(content_html, ?) > 0) +
      (SELECT COUNT(*) FROM post_revisions WHERE instr(content_json, ?) > 0) +
      (SELECT COUNT(*) FROM profiles WHERE instr(avatar_url, ?) > 0) +
      (SELECT COUNT(*) FROM wishlist_places WHERE instr(image_url, ?) > 0) AS refs`,
    args: [publicId, publicId, publicId, publicId, publicId, publicId],
  });

  if (Number(result.rows[0]?.refs ?? 0) === 0) {
    await deleteLocalMedia(publicId);
  }
}

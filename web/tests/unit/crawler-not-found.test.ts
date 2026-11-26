import { describe, expect, it } from "vitest";

import { normalizeCrawlerNotFound } from "../../worker-entry";

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CHROME =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function requestWith(userAgent: string): Request {
  return new Request("https://jsquaredadventures.com/posts/nope", {
    headers: { "user-agent": userAgent },
  });
}

describe("normalizeCrawlerNotFound", () => {
  it("turns a streamed not-found body into 404 for crawlers", async () => {
    const response = await normalizeCrawlerNotFound(
      requestWith(GOOGLEBOT),
      htmlResponse('<html data-dgst="NEXT_HTTP_ERROR_FALLBACK;404"></html>'),
    );

    expect(response.status).toBe(404);
  });

  it("keeps 200 for human browsers", async () => {
    const response = await normalizeCrawlerNotFound(
      requestWith(CHROME),
      htmlResponse('<html data-dgst="NEXT_HTTP_ERROR_FALLBACK;404"></html>'),
    );

    expect(response.status).toBe(200);
  });

  it("does not rewrite a normal crawler page", async () => {
    const response = await normalizeCrawlerNotFound(
      requestWith(GOOGLEBOT),
      htmlResponse("<html><body>First Adventure</body></html>"),
    );

    expect(response.status).toBe(200);
  });

  it("ignores non-HTML responses", async () => {
    const response = await normalizeCrawlerNotFound(
      requestWith(GOOGLEBOT),
      new Response('{"ok":true}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
  });
});

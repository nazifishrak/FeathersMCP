import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeShareKnowledgeMagicLink,
  SHARE_KNOWLEDGE_MAX_URL_LENGTH,
} from "../tools/share-knowledge.js";

describe("share-knowledge magic link", () => {
  const baseArgs = {
    title: "My Tutorial",
    author: "testuser",
    tags: ["hooks", "mcp"],
    repoOwner: "testowner",
    repoName: "testrepo",
    label: "community-contribution",
  };

  it("returns a short URL without truncation for small content", () => {
    const content = "Short body.";
    const { magicLink, truncated } = computeShareKnowledgeMagicLink({
      ...baseArgs,
      content,
    });
    assert.equal(truncated, false);
    assert.ok(magicLink.includes("github.com"));
    assert.ok(magicLink.length <= SHARE_KNOWLEDGE_MAX_URL_LENGTH);
    const body = new URL(magicLink).searchParams.get("body");
    assert.ok(body);
    assert.ok(!decodeURIComponent(body!).includes("NOTE: Content was truncated"));
  });

  it("truncates very long content so URL length is at most 8191", () => {
    const content = "word ".repeat(25_000);
    const { magicLink, truncated } = computeShareKnowledgeMagicLink({
      ...baseArgs,
      content,
    });
    assert.equal(truncated, true);
    assert.ok(magicLink.length <= SHARE_KNOWLEDGE_MAX_URL_LENGTH);
    const body = new URL(magicLink).searchParams.get("body");
    assert.ok(body);
    const decoded = decodeURIComponent(body!);
    assert.ok(decoded.includes("NOTE: Content was truncated"));
    const count = (decoded.match(/NOTE: Content was truncated/g) || []).length;
    assert.equal(count, 1);
  });

  it("truncates when URL would exceed 8191 (boundary)", () => {
    let content = "x";
    for (let i = 0; i < 25; i++) {
      const { magicLink, truncated } = computeShareKnowledgeMagicLink({
        ...baseArgs,
        content,
      });
      assert.ok(magicLink.length <= SHARE_KNOWLEDGE_MAX_URL_LENGTH);
      if (truncated) {
        return;
      }
      content = content.repeat(2);
    }
    assert.fail("expected truncation within growth iterations");
  });

  it("throws when title alone cannot fit in URL budget", () => {
    assert.throws(
      () =>
        computeShareKnowledgeMagicLink({
          ...baseArgs,
          title: "T".repeat(50_000),
          content: "",
        }),
      /cannot fit URL under/,
    );
  });
});

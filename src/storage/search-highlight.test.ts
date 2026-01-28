import { describe, expect, it } from "vitest";

import { extractSnippet } from "./search-repository.js";

describe("extractSnippet", () => {
  it("should wrap matched terms in <mark> tags", () => {
    const text = "This is a simple test case for highlighting.";
    const query = "simple test";

    const snippet = extractSnippet(text, query);

    // This expectation will fail currently because extractSnippet doesn't add tags yet
    expect(snippet).toContain("<mark>simple</mark>");
    expect(snippet).toContain("<mark>test</mark>");
  });

  it("should handle case insensitivity", () => {
    const text = "This is a Simple Test case.";
    const query = "simple test";

    const snippet = extractSnippet(text, query);

    expect(snippet).toContain("<mark>Simple</mark>");
    expect(snippet).toContain("<mark>Test</mark>");
  });

  it("should handle multiple occurrences", () => {
    const text = "test test test";
    const query = "test";

    const snippet = extractSnippet(text, query);

    // It should highlight all of them if they fit in the snippet
    // Note: The current implementation might just center on the first match.
    // The requirement implies highlighting terms *within* the snippet.
    expect(snippet).toContain("<mark>test</mark>");
  });
});

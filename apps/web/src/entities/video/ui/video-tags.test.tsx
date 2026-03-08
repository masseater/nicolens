import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { VideoTags } from "./video-tags";

const EMPTY_TAGS: string[] = [];
const THREE_TAGS = ["tag1", "tag2", "tag3"];
const TWO_TAGS = ["tag1", "tag2"];
const SINGLE_TAG = ["tag1"];
const JAPANESE_TAG = ["タグ名"];

describe("VideoTags", () => {
  it("returns null when tags array is empty", () => {
    const { container } = render(<VideoTags tags={EMPTY_TAGS} query="" />);

    expect(container.firstChild).toBeNull();
  });

  it("renders tag badges for each tag", () => {
    const { container } = render(<VideoTags tags={THREE_TAGS} query="" />);
    const view = within(container);

    expect(view.getByText("tag1")).toBeInTheDocument();
    expect(view.getByText("tag2")).toBeInTheDocument();
    expect(view.getByText("tag3")).toBeInTheDocument();
  });

  it("renders links with correct href for each tag", () => {
    const { container } = render(<VideoTags tags={TWO_TAGS} query="" />);
    const view = within(container);

    const links = view.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/search?q=tag1&targets=tagsExact");
    expect(links[1]).toHaveAttribute("href", "/search?q=tag2&targets=tagsExact");
  });

  it("encodes special characters in tag URLs", () => {
    const { container } = render(<VideoTags tags={JAPANESE_TAG} query="" />);
    const view = within(container);

    const link = view.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `/search?q=${encodeURIComponent("タグ名")}&targets=tagsExact`,
    );
  });

  it("highlights query keywords in tags", () => {
    const { container } = render(<VideoTags tags={SINGLE_TAG} query="tag1" />);

    const markElement = container.querySelector("mark");
    expect(markElement).not.toBeNull();
    expect(markElement?.textContent).toBe("tag1");
  });

  it("applies custom className", () => {
    const { container } = render(<VideoTags tags={SINGLE_TAG} query="" className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });
});

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VideoStats } from "./video-stats";

const mockVideo = {
  contentId: "sm12345",
  title: "Test Video Title",
  viewCounter: 12345,
  mylistCounter: 100,
  likeCounter: 50,
  lengthSeconds: 180,
  thumbnailUrl: "https://example.com/thumb",
  startTime: "2024-06-15T12:00:00+09:00",
  commentCounter: 500,
  tags: "tag1 tag2 tag3",
  genre: "ゲーム",
  lastResBody: "最後のコメント",
};

describe("VideoStats", () => {
  it("renders all five stat items", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    const statItems = view.getAllByText(/.+/);
    expect(statItems.length).toBeGreaterThanOrEqual(5);
  });

  it("displays formatted view count (1.2万 for 12345)", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    expect(view.getByText("1.2万")).toBeInTheDocument();
  });

  it("displays formatted comment count", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    expect(view.getByText("500")).toBeInTheDocument();
  });

  it("displays formatted mylist count", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    expect(view.getByText("100")).toBeInTheDocument();
  });

  it("displays formatted like count", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    expect(view.getByText("50")).toBeInTheDocument();
  });

  it("displays formatted date for startTime", () => {
    const { container } = render(<VideoStats video={mockVideo} />);
    const view = within(container);

    expect(view.getByText("2024/06/15")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<VideoStats video={mockVideo} className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });
});

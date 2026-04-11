import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VideoThumbnailImage } from "./video-thumbnail-image";

describe("VideoThumbnailImage", () => {
  it("renders image with large thumbnail URL (.L suffix) initially", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.L");
  });

  it("shows loading state before image loads", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    expect(view.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("image has opacity-0 class before loading completes", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img.className).toContain("opacity-0");
  });

  it("applies custom className to img element", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
        className="custom-class"
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img.className).toContain("custom-class");
  });

  it("sets width and height attributes on img", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img).toHaveAttribute("width", "352");
    expect(img).toHaveAttribute("height", "198");
  });
});

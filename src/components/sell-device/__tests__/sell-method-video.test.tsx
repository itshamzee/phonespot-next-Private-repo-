import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SellMethodVideo } from "../sell-method-video";

describe("SellMethodVideo", () => {
  it("only loads the film after the customer chooses to play it", () => {
    const { container } = render(<SellMethodVideo />);
    expect(container.querySelector("video")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Afspil: Sådan sælger du din enhed/ }));
    const video = screen.getByLabelText("Sådan sælger du din enhed til PhoneSpot");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).not.toHaveAttribute("loop");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/saelg-din-enhed.mp4");
  });
});

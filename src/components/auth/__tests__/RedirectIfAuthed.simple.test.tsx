import { render } from "@testing-library/react";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import { supabase } from "@/lib/supabase";

describe("RedirectIfAuthed", () => {
  it("renders children when not authed", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { findByText } = render(
      <RedirectIfAuthed>
        <div>Public</div>
      </RedirectIfAuthed>
    );

    expect(await findByText("Public")).toBeInTheDocument();
  });

  it("renders nothing when authed", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const { container } = render(
      <RedirectIfAuthed>
        <div>Public</div>
      </RedirectIfAuthed>
    );
    // allow effect flush
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});

import { render } from "@testing-library/react";
import RedirectIfOnboarded from "@/components/auth/RedirectIfOnboarded";
import { supabase } from "@/lib/supabase";

describe("RedirectIfOnboarded", () => {
  it("renders children when not onboarded", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: {} } },
    });
    const { findByText } = render(
      <RedirectIfOnboarded>
        <div>Onboarding</div>
      </RedirectIfOnboarded>
    );
    expect(await findByText("Onboarding")).toBeDefined();
  });

  it("renders nothing when onboarded", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { onboarded: true } } },
    });
    const { container } = render(
      <RedirectIfOnboarded>
        <div>Onboarding</div>
      </RedirectIfOnboarded>
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(container.firstChild).toBeNull();
  });
});

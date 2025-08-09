import { render, screen, waitFor } from "@testing-library/react";
import RequireAuth from "@/components/auth/RequireAuth";
import { supabase } from "@/lib/supabase";

describe("RequireAuth", () => {
  it("redirects to /login when no user", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    render(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    await waitFor(() => {
      expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    });
  });

  it("renders children when user exists", async () => {
    // @ts-expect-error jest mock
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "1" } } });
    render(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected")).toBeInTheDocument();
    });
  });
});

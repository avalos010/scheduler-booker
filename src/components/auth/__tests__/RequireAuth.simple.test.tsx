import { render, screen, waitFor } from "@testing-library/react";
import RequireAuth from "@/components/auth/RequireAuth";
import { supabase } from "@/lib/supabase";

// Mock the supabase module completely
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
    },
  },
}));

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
      expect(screen.queryByText("Protected")).toBeNull();
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
      expect(screen.getByText("Protected")).not.toBeNull();
    });
  });
});

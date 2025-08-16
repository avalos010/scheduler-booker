import { render, screen, waitFor } from "@testing-library/react";
import ClientRequireAuth from "@/components/auth/ClientRequireAuth";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

describe("ClientRequireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("redirects to /login when no user", async () => {
    // Mock failed auth check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(
      <ClientRequireAuth>
        <div>Protected</div>
      </ClientRequireAuth>
    );

    await waitFor(() => {
      expect(screen.queryByText("Protected")).toBeNull();
    });
  });

  it("renders children when user exists", async () => {
    // Mock successful auth check
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    render(
      <ClientRequireAuth>
        <div>Protected</div>
      </ClientRequireAuth>
    );
    
    await waitFor(() => {
      expect(screen.getByText("Protected")).not.toBeNull();
    });
  });

  it("shows loading state initially", () => {
    // Mock fetch to not resolve immediately
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <ClientRequireAuth>
        <div>Protected</div>
      </ClientRequireAuth>
    );

    expect(screen.getByText("Checking authentication...")).toBeDefined();
  });
});

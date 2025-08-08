import React from "react";
import { render, screen, waitFor } from "@/lib/test-utils";
import userEvent from "@testing-library/user-event";
import LoginForm from "../LoginForm";
import { TEST_USER } from "@/lib/test-utils";

import { supabase } from "../../../lib/supabase";

const mockSupabase = supabase;

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login form with all fields", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: "Login" })).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /login/i })).toBeDefined();
  });

  it("handles successful login", async () => {
    const user = userEvent.setup();
    (
      mockSupabase as unknown as { auth: { signInWithPassword: jest.Mock } }
    ).auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "123", email: TEST_USER.email } },
      error: null,
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login/i });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(
        (mockSupabase as unknown as { auth: { signInWithPassword: jest.Mock } })
          .auth.signInWithPassword
      ).toHaveBeenCalledWith({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeDefined();
    });
  });

  it("handles login error", async () => {
    const user = userEvent.setup();
    const errorMessage = "Invalid email or password";
    (
      mockSupabase as unknown as { auth: { signInWithPassword: jest.Mock } }
    ).auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: errorMessage },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /login/i });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeDefined();
    });
  });
});

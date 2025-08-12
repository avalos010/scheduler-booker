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
    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
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

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

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

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeDefined();
    });
  });

  it("renders remember me checkbox and forgot password link", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/remember me/i)).toBeDefined();
    expect(screen.getByText(/forgot password/i)).toBeDefined();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole("button", { name: "" }); // Eye icon button

    // Password should be hidden by default
    expect(passwordInput.getAttribute("type")).toBe("password");

    // Click toggle to show password
    await user.click(toggleButton);
    expect(passwordInput.getAttribute("type")).toBe("text");

    // Click toggle to hide password again
    await user.click(toggleButton);
    expect(passwordInput.getAttribute("type")).toBe("password");
  });
});

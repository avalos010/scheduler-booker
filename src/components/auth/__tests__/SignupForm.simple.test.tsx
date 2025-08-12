import React from "react";
import { render, screen, waitFor } from "@/lib/test-utils";
import userEvent from "@testing-library/user-event";
import SignupForm from "../SignupForm";
import { supabase } from "../../../lib/supabase";
import { TEST_USER } from "@/lib/test-utils";

// Mock Supabase
jest.mock("@/lib/supabase");

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe("SignupForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders signup form with all fields", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/email address/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeDefined();
  });

  it("handles successful signup", async () => {
    const user = userEvent.setup();
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "123", email: TEST_USER.email } },
      error: null,
    });

    render(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByLabelText(
      /i agree to the terms of service/i
    );
    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.type(confirmPasswordInput, TEST_USER.password);
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/signup successful/i)).toBeDefined();
    });
  });

  it("handles signup error", async () => {
    const user = userEvent.setup();
    const errorMessage = "Email already exists";
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: { message: errorMessage },
    });

    render(<SignupForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByLabelText(
      /i agree to the terms of service/i
    );
    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.type(confirmPasswordInput, TEST_USER.password);
    await user.click(termsCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeDefined();
    });
  });

  it("renders terms agreement checkbox", () => {
    render(<SignupForm />);
    expect(
      screen.getByLabelText(/i agree to the terms of service/i)
    ).toBeDefined();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const toggleButtons = screen.getAllByRole("button", { name: "" }); // Eye icon buttons

    // Passwords should be hidden by default
    expect(passwordInput.getAttribute("type")).toBe("password");
    expect(confirmPasswordInput.getAttribute("type")).toBe("password");

    // Click first toggle to show password
    await user.click(toggleButtons[0]);
    expect(passwordInput.getAttribute("type")).toBe("text");

    // Click second toggle to show confirm password
    await user.click(toggleButtons[1]);
    expect(confirmPasswordInput.getAttribute("type")).toBe("text");
  });
});

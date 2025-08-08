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

    expect(
      screen.getByRole("heading", { name: "Sign Up" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i })
    ).toBeInTheDocument();
  });

  it("handles successful signup", async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: "123", email: TEST_USER.email } },
      error: null,
    });

    render(<SignupForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.type(confirmPasswordInput, TEST_USER.password);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/signup successful/i)).toBeInTheDocument();
    });
  });

  it("handles signup error", async () => {
    const user = userEvent.setup();
    const errorMessage = "Email already exists";
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: errorMessage },
    });

    render(<SignupForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    await user.type(emailInput, TEST_USER.email);
    await user.type(passwordInput, TEST_USER.password);
    await user.type(confirmPasswordInput, TEST_USER.password);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});

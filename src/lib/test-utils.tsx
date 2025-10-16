import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TEST_CONFIG } from "./test-config";

// Test user data
export const TEST_USER = {
  email: TEST_CONFIG.user.email,
  password: TEST_CONFIG.user.password,
  name: TEST_CONFIG.user.name,
  businessName: TEST_CONFIG.business.name,
  businessType: TEST_CONFIG.business.type,
  timezone: TEST_CONFIG.onboarding.timezone,
};

// Test onboarding data
export const TEST_ONBOARDING_DATA = {
  userType: TEST_CONFIG.onboarding.userType,
  businessName: TEST_CONFIG.business.name,
  businessType: TEST_CONFIG.business.type,
  name: TEST_CONFIG.user.name,
  timezone: TEST_CONFIG.onboarding.timezone,
  workDays: TEST_CONFIG.onboarding.workDays,
  startTime: TEST_CONFIG.onboarding.startTime,
  endTime: TEST_CONFIG.onboarding.endTime,
  timeSlotDuration: TEST_CONFIG.onboarding.timeSlotDuration,
};

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        // Removed cacheTime as it's not a known property here
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };

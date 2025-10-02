"use client";

import toast from "react-hot-toast";

export interface SnackbarOptions {
  duration?: number;
  persistent?: boolean;
}

export function useSnackbar() {
  // Custom warning toast with specific styling
  const warning = (message: string, options: SnackbarOptions = {}) => {
    const { duration, persistent } = options;
    
    return toast(message, {
      ...options,
      duration: persistent ? Infinity : duration,
      icon: "⚠️",
      style: {
        background: "#F59E0B",
        color: "#fff",
      },
    });
  };

  return {
    // Direct exports from react-hot-toast
    success: toast.success,
    error: toast.error,
    info: toast,
    loading: toast.loading,
    dismiss: toast.dismiss,
    dismissAll: () => toast.dismiss(),
    update: toast,
    // Custom warning implementation
    warning,
  };
}
"use client";

import toast from "react-hot-toast";

export type SnackbarType = "success" | "error" | "warning" | "info" | "loading";

export interface SnackbarOptions {
  type?: SnackbarType;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  persistent?: boolean;
}

export function useSnackbar() {
  const showToast = (message: string, options: SnackbarOptions = {}) => {
    const { type = "info", duration, persistent } = options;

    const toastOptions = {
      duration: persistent ? Infinity : duration,
      ...options,
    };

    switch (type) {
      case "success":
        return toast.success(message, toastOptions);
      case "error":
        return toast.error(message, toastOptions);
      case "warning":
        return toast(message, {
          ...toastOptions,
          icon: "⚠️",
          style: {
            background: "#F59E0B",
            color: "#fff",
          },
        });
      case "loading":
        return toast.loading(message, toastOptions);
      case "info":
      default:
        return toast(message, toastOptions);
    }
  };

  const dismissToast = (toastId: string) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  const updateToast = (toastId: string, message: string, options: SnackbarOptions = {}) => {
    const { type = "info", duration, persistent } = options;

    const toastOptions = {
      duration: persistent ? Infinity : duration,
      ...options,
    };

    switch (type) {
      case "success":
        return toast.success(message, { ...toastOptions, id: toastId });
      case "error":
        return toast.error(message, { ...toastOptions, id: toastId });
      case "warning":
        return toast(message, {
          ...toastOptions,
          id: toastId,
          icon: "⚠️",
          style: {
            background: "#F59E0B",
            color: "#fff",
          },
        });
      case "loading":
        return toast.loading(message, { ...toastOptions, id: toastId });
      case "info":
      default:
        return toast(message, { ...toastOptions, id: toastId });
    }
  };

  return {
    showToast,
    dismissToast,
    dismissAll,
    updateToast,
    // Convenience methods
    success: (message: string, options?: Omit<SnackbarOptions, "type">) =>
      showToast(message, { ...options, type: "success" }),
    error: (message: string, options?: Omit<SnackbarOptions, "type">) =>
      showToast(message, { ...options, type: "error" }),
    warning: (message: string, options?: Omit<SnackbarOptions, "type">) =>
      showToast(message, { ...options, type: "warning" }),
    info: (message: string, options?: Omit<SnackbarOptions, "type">) =>
      showToast(message, { ...options, type: "info" }),
    loading: (message: string, options?: Omit<SnackbarOptions, "type">) =>
      showToast(message, { ...options, type: "loading" }),
  };
}

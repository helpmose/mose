"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/lib/contexts/theme-context";

export default function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme === "black" ? "dark" : "light"}
      position="top-right"
      richColors
      closeButton
    />
  );
}
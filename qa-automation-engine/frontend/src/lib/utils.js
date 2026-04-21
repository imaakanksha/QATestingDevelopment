import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Backend API base URL — uses Vite proxy in dev, so just relative paths.
 */
export const API_BASE = "/api";

/**
 * Open an HTML report string in a new browser tab and trigger print dialog.
 * The browser's print dialog has a built-in "Save as PDF" option which is
 * far more reliable than client-side PDF libraries.
 *
 * @param {string} htmlContent  – Full HTML document string from the backend
 * @param {string} title        – Tab title for the print window
 */
export function printHtmlReport(htmlContent, title = "Report") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Pop-up blocked — please allow pop-ups for this site");
  }
  printWindow.document.write(htmlContent);
  printWindow.document.title = title;
  printWindow.document.close();
  // Wait for styles/fonts to load before triggering print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";

interface ReportDownloadButtonProps {
  type: "student" | "class";
  id: string;
  label?: string;
  variant?: "button" | "icon";
  className?: string;
}

export default function ReportDownloadButton({
  type,
  id,
  label,
  variant = "button",
  className = "",
}: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const endpoint = type === "student"
        ? `/api/teacher/reports/student/${id}`
        : `/api/teacher/reports/class/${id}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const html = await response.text();
      
      // Create a new window with the HTML content for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 ${className}`}
        title={`Download ${type} report`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        ) : (
          <FileText className="w-5 h-5 text-gray-500" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>{label || `Export ${type === "student" ? "Student" : "Class"} Report`}</span>
    </button>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BitByBit - Learn to Code with AI-Powered Education",
  description: "Master programming with BitByBit - an interactive coding platform featuring AI-powered assistance, real-time validation, and hands-on projects.",
  keywords: ["coding", "programming", "education", "learn to code", "JavaScript", "Python", "AI tutor"],
  authors: [{ name: "BitByBit Team" }],
  openGraph: {
    title: "BitByBit - Learn to Code with AI-Powered Education",
    description: "Master programming with BitByBit - an interactive coding platform featuring AI-powered assistance, real-time validation, and hands-on projects.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BitByBit - Learn to Code with AI-Powered Education",
    description: "Master programming with BitByBit - an interactive coding platform.",
  },
  viewport: "width=device-width, initial-scale=1.0",
  themeColor: "#007bff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Yard Restaurant | Fine Dining in Douala, Cameroon",
  description: "Experience fine dining excellence in the heart of Douala. African & International cuisine crafted with passion. Restaurant, Bar & Terrace. Book your table today!",
  keywords: ["The Yard", "Restaurant Douala", "Fine Dining Cameroon", "African Cuisine", "International Cuisine", "Bar", "Terrace", "Reservation"],
  authors: [{ name: "The Yard Restaurant" }],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  openGraph: {
    title: "The Yard Restaurant | Fine Dining in Douala",
    description: "African & International cuisine crafted with passion. Restaurant, Bar & Terrace.",
    url: "https://theyard-douala.com",
    siteName: "The Yard Restaurant",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Yard Restaurant | Fine Dining in Douala",
    description: "African & International cuisine crafted with passion. Restaurant, Bar & Terrace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}

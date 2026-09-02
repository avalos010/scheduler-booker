import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/common/Navbar";
import { SnackbarProvider } from "@/components/snackbar";
import { Analytics } from "@vercel/analytics/next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import QueryProvider from "@/lib/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Scheduler Booker | Online Appointment Scheduling",
    template: "%s | Scheduler Booker",
  },
  description:
    "Create a booking page, set your weekly availability, and manage upcoming client appointments from one simple scheduling dashboard.",
  applicationName: "Scheduler Booker",
  keywords: [
    "appointment scheduling",
    "online booking",
    "calendar management",
    "availability management",
    "time slot booking",
    "professional scheduling",
    "consultant calendar",
    "service provider booking",
    "automated scheduling",
    "client booking system",
  ],
  authors: [{ name: "Scheduler Booker Team" }],
  creator: "Scheduler Booker",
  publisher: "Scheduler Booker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://scheduler-booker.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scheduler-booker.vercel.app",
    siteName: "Scheduler Booker",
    title: "Scheduler Booker | Online Appointment Scheduling",
    description:
      "Create a booking page, set your availability, and manage upcoming client appointments in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scheduler Booker | Online Appointment Scheduling",
    description:
      "Create a booking page, set your availability, and manage upcoming client appointments in one place.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  category: "Business & Productivity",
  classification: "Scheduling & Booking Software",
};

// Force dynamic rendering to re-evaluate auth on each request
export const dynamic = "force-dynamic";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://scheduler-booker.vercel.app/#website",
  name: "Scheduler Booker",
  description:
    "Online appointment scheduling and booking software for independent professionals.",
  url: "https://scheduler-booker.vercel.app",
  inLanguage: "en-US",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check auth on server side - only pass boolean to client
  // Use getSession() which checks locally without API call
  let isAuthed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getSession();
    isAuthed = !!data.session;
  } catch {
    // Invalid tokens - treat as not authenticated
    isAuthed = false;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Scheduler Booker" />
        <meta name="application-name" content="Scheduler Booker" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Manifest and icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo-192.svg" />
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Site identity structured data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData).replace(/</g, "\\u003c")}
        </script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <QueryProvider>
          <SnackbarProvider>
            <Navbar isAuthed={isAuthed} />
            {children}
          </SnackbarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

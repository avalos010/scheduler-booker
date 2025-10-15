import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";
import { SnackbarProvider } from "@/components/snackbar";
import { Analytics } from "@vercel/analytics/next";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    default:
      "Scheduler Booker - Intelligent Appointment Scheduling & Booking Platform",
    template: "%s | Scheduler Booker",
  },
  description:
    "Streamline your appointment booking with our intelligent scheduling platform. Manage availability, automate bookings, and focus on what matters most. Perfect for professionals, consultants, and service providers.",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scheduler-booker.vercel.app",
    siteName: "Scheduler Booker",
    title:
      "Scheduler Booker - Intelligent Appointment Scheduling & Booking Platform",
    description:
      "Streamline your appointment booking with our intelligent scheduling platform. Manage availability, automate bookings, and focus on what matters most.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Scheduler Booker - Professional Appointment Scheduling Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Scheduler Booker - Intelligent Appointment Scheduling & Booking Platform",
    description:
      "Streamline your appointment booking with our intelligent scheduling platform. Manage availability, automate bookings, and focus on what matters most.",
    images: ["/og-image.png"],
    creator: "@schedulerbooker",
    site: "@schedulerbooker",
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
    <html lang="en">
      <head>
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* Additional SEO meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
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
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icon-16x16.png"
        />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Scheduler Booker",
              description:
                "Intelligent appointment scheduling and booking platform for professionals",
              url: "https://scheduler-booker.vercel.app",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "Scheduler Booker Team",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <SnackbarProvider>
          <Navbar isAuthed={isAuthed} />
          {children}
        </SnackbarProvider>
      </body>
    </html>
  );
}

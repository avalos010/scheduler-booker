import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Online Appointment Scheduling for Independent Professionals",
  description:
    "Set your availability, share a booking link, and manage client appointment requests from one straightforward dashboard.",
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
    "business scheduling",
    "meeting scheduler",
  ],
  openGraph: {
    title: "Scheduler Booker - Simple Online Appointment Scheduling",
    description:
      "Set your availability, share a booking link, and manage client appointment requests from one dashboard.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scheduler Booker - Simple Online Appointment Scheduling",
    description:
      "Set your availability, share a booking link, and manage client appointment requests from one dashboard.",
  },
  alternates: {
    canonical: "/",
  },
};

const softwareApplicationStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Scheduler Booker",
  description:
    "Online appointment scheduling and booking software for independent professionals.",
  url: "https://scheduler-booker.vercel.app",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default async function Home() {
  // Check authentication on server side for better performance
  // Handle auth errors gracefully (invalid/expired tokens)
  try {
    const supabase = await createSupabaseServerClient();

    // First check if there's a valid session (fast, local check)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    // Only proceed if we have a valid session without errors
    if (sessionData.session && !sessionError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // User is authenticated, check if they need onboarding
        const onboarded = Boolean(user.user_metadata?.onboarded);

        if (onboarded) {
          // User is fully set up, redirect to dashboard
          redirect("/dashboard");
        } else {
          // User needs to complete onboarding
          redirect("/onboarding");
        }
      }
    }
  } catch {
    // Invalid tokens - continue to render landing page
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <script type="application/ld+json">
        {JSON.stringify(softwareApplicationStructuredData).replace(
          /</g,
          "\\u003c"
        )}
      </script>
      <main>
        <section className="border-b border-gray-200 px-6 py-16 dark:border-slate-800 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.9fr]">
            <div className="max-w-2xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                Scheduling without the back-and-forth
              </p>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                Give clients a simple way to book your time.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-slate-300">
                Set the hours you work, share one link, and review every request
                from a single dashboard. No email chains or calendar guessing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Create your booking page
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Sign in
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> Free to start
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" /> No credit card
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-xl shadow-gray-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:p-6">
              <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-slate-700">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">September 2026</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Select an available time</p>
                </div>
                <CalendarDaysIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
                  <div key={day} className={index === 2 ? "rounded-lg bg-blue-600 py-3 text-white" : "py-3"}>
                    <p className={`text-xs ${index === 2 ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}>{day}</p>
                    <p className="mt-1 font-semibold">{7 + index}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {["9:00 AM", "10:30 AM", "1:00 PM"].map((time, index) => (
                  <div
                    key={time}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      index === 1
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{time}</span>
                    <span className={`text-xs font-medium ${index === 1 ? "text-blue-700 dark:text-blue-200" : "text-gray-500 dark:text-slate-400"}`}>
                      {index === 1 ? "Selected" : "Available"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900 lg:order-1 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Weekly availability</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Your regular working hours</p>
                </div>
                <span className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  Availability settings
                </span>
              </div>
              <div className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white px-4 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                {[
                  ["Monday", "9:00 AM – 5:00 PM"],
                  ["Tuesday", "9:00 AM – 5:00 PM"],
                  ["Wednesday", "10:00 AM – 6:00 PM"],
                  ["Thursday", "9:00 AM – 5:00 PM"],
                  ["Friday", "9:00 AM – 3:00 PM"],
                ].map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between py-3.5">
                    <span className="font-medium text-gray-800 dark:text-slate-200">{day}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{hours}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <ClockIcon className="h-4 w-4" />
                60-minute appointments · 15-minute breaks
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                You set the rules
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Your availability stays in your hands.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600 dark:text-slate-300">
                Decide when clients can book, how long meetings run, and how much
                breathing room you need between them.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <CalendarDaysIcon className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-300" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Change a day without changing your week</h3>
                    <p className="mt-1 text-gray-600 dark:text-slate-400">Make one-off adjustments while keeping your regular hours intact.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <LinkIcon className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-300" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">One link for every client</h3>
                    <p className="mt-1 text-gray-600 dark:text-slate-400">Your public page always reflects the availability you have set.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <UserGroupIcon className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-300" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Requests wait for your approval</h3>
                    <p className="mt-1 text-gray-600 dark:text-slate-400">Review the client and time before confirming an appointment.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50 px-6 py-16 dark:border-slate-800 dark:bg-slate-900 sm:py-20">
          <div className="mx-auto flex max-w-5xl flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Make your calendar easier to book.
              </h2>
              <p className="mt-3 text-gray-600 dark:text-slate-300">
                Create your availability and send clients your link.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Get started
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-gray-200 pt-8 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Scheduler Booker</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms</Link>
            <a href="mailto:luizavalos40@gmail.com" className="hover:text-gray-900 dark:hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

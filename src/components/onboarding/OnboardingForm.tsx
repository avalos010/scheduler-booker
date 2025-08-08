"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userTypeSchema = z.object({
  userType: z.enum(["business", "individual"]),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  timezone: z.string().min(1, "Please select a timezone"),
});

const availabilitySchema = z.object({
  workDays: z.array(z.string()).min(1, "Please select at least one work day"),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  timeSlotDuration: z.number().min(15).max(120),
});

type UserTypeData = z.infer<typeof userTypeSchema>;
type AvailabilityData = z.infer<typeof availabilitySchema>;

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const workDays = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<
    Partial<UserTypeData & AvailabilityData>
  >({});

  const userTypeForm = useForm<UserTypeData>({
    resolver: zodResolver(userTypeSchema),
  });

  const availabilityForm = useForm<AvailabilityData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      timeSlotDuration: 30,
    },
  });

  const onUserTypeSubmit = async (data: UserTypeData) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const onAvailabilitySubmit = async (data: AvailabilityData) => {
    setIsLoading(true);
    try {
      // Here you would save the onboarding data to your database
      console.log("Onboarding data:", { ...formData, ...data });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect to dashboard or next step
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkDayToggle = (day: string) => {
    const currentDays = availabilityForm.getValues("workDays");
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    availabilityForm.setValue("workDays", newDays);
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
            Welcome to Scheduler Booker!
          </h2>
          <p className="text-gray-800 text-center">
            Let&apos;s get you set up in just a few steps.
          </p>
        </div>

        <form
          onSubmit={userTypeForm.handleSubmit(onUserTypeSubmit)}
          className="space-y-6"
        >
          <div>
            <label className="block text-lg font-medium text-gray-800 mb-4">
              Are you setting up scheduling for a business or yourself?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => userTypeForm.setValue("userType", "business")}
                className={`p-6 border-2 rounded-lg text-left transition-colors ${
                  userTypeForm.watch("userType") === "business"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="font-semibold text-lg text-gray-900 mb-2">
                  🏢 Business
                </div>
                <div className="text-gray-800">
                  I&apos;m setting up scheduling for my business or organization
                </div>
              </button>

              <button
                type="button"
                onClick={() => userTypeForm.setValue("userType", "individual")}
                className={`p-6 border-2 rounded-lg text-left transition-colors ${
                  userTypeForm.watch("userType") === "individual"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="font-semibold text-lg text-gray-900 mb-2">
                  👤 Individual
                </div>
                <div className="text-gray-800">
                  I&apos;m setting up scheduling for myself
                </div>
              </button>
            </div>
            {userTypeForm.formState.errors.userType && (
              <p className="mt-2 text-sm text-red-600">
                {userTypeForm.formState.errors.userType.message}
              </p>
            )}
          </div>

          {userTypeForm.watch("userType") === "business" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Business Name
                </label>
                <input
                  {...userTypeForm.register("businessName")}
                  type="text"
                  id="businessName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label
                  htmlFor="businessType"
                  className="block text-sm font-medium text-gray-800 mb-1"
                >
                  Business Type
                </label>
                <select
                  {...userTypeForm.register("businessType")}
                  id="businessType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select business type</option>
                  <option value="consulting">Consulting</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="legal">Legal</option>
                  <option value="beauty">Beauty & Wellness</option>
                  <option value="education">Education</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              {userTypeForm.watch("userType") === "business"
                ? "Your Name"
                : "Full Name"}
            </label>
            <input
              {...userTypeForm.register("name")}
              type="text"
              id="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Enter your full name"
            />
            {userTypeForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {userTypeForm.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="timezone"
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              Timezone
            </label>
            <select
              {...userTypeForm.register("timezone")}
              id="timezone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Select your timezone</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
            {userTypeForm.formState.errors.timezone && (
              <p className="mt-1 text-sm text-red-600">
                {userTypeForm.formState.errors.timezone.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Continue to Availability Setup
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Set Your Availability
        </h2>
        <p className="text-gray-800 text-center">
          Configure when you&apos;re available for appointments
        </p>
      </div>

      <form
        onSubmit={availabilityForm.handleSubmit(onAvailabilitySubmit)}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-medium text-gray-800 mb-4">
            Which days are you available?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workDays.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleWorkDayToggle(day.value)}
                className={`p-3 border-2 rounded-lg transition-colors ${
                  availabilityForm.watch("workDays").includes(day.value)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {availabilityForm.formState.errors.workDays && (
            <p className="mt-2 text-sm text-red-600">
              {availabilityForm.formState.errors.workDays.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              Start Time
            </label>
            <input
              {...availabilityForm.register("startTime")}
              type="time"
              id="startTime"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            {availabilityForm.formState.errors.startTime && (
              <p className="mt-1 text-sm text-red-600">
                {availabilityForm.formState.errors.startTime.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="endTime"
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              End Time
            </label>
            <input
              {...availabilityForm.register("endTime")}
              type="time"
              id="endTime"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            {availabilityForm.formState.errors.endTime && (
              <p className="mt-1 text-sm text-red-600">
                {availabilityForm.formState.errors.endTime.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="timeSlotDuration"
            className="block text-sm font-medium text-gray-800 mb-1"
          >
            Appointment Duration (minutes)
          </label>
          <select
            {...availabilityForm.register("timeSlotDuration", {
              valueAsNumber: true,
            })}
            id="timeSlotDuration"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Back
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? "Setting up..." : "Complete Setup"}
          </button>
        </div>
      </form>
    </div>
  );
}

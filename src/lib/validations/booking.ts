import { z } from "zod";

export const bookingFormSchema = z.object({
  clientName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  clientEmail: z
    .string()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email must be less than 100 characters"),

  clientPhone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || /^[\+]?[1-9][\d]{0,15}$/.test(val.replace(/[\s\-\(\)]/g, "")),
      {
        message: "Please enter a valid phone number",
      }
    ),

  notes: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: "Notes must be less than 500 characters",
    }),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;

export const publicBookingFormSchema = bookingFormSchema.extend({
  // Add any additional validation for public forms if needed
});

export type PublicBookingFormData = z.infer<typeof publicBookingFormSchema>;

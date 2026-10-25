import { z } from "zod";
import { COUNTRY_CODES } from "./countries";

const countries = new Set<string>(COUNTRY_CODES);

export const emailSchema = z
  .string()
  .trim()
  .max(200)
  .email()
  .refine((value) => !/[\r\n]/.test(value), "Invalid email");

export const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => countries.has(value), "Choose a country from the list");

export const promptSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
}).strict();

export const orderSchema = z.object({
  listingId: z.string().uuid(),
  email: z.union([z.literal(""), emailSchema]).optional(),
  country: countrySchema.optional(),
  turnstileToken: z.string().max(2000).optional(),
}).strict();

export const profileSchema = z.object({
  email: emailSchema.nullable().optional(),
  country: countrySchema.nullable().optional(),
}).strict();

export const verifyBodySchema = z.object({
  signature: z.string().min(32).max(200).optional(),
}).strict();

export const siwsSchema = z.object({
  message: z.string().min(40).max(2000),
  signature: z.string().min(64).max(200),
  address: z.string().min(32).max(64),
}).strict();

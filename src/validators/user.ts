import { z } from 'zod';
import { LIMITS } from '../constants/limits';

export const phoneNumberSchema = z
  .string()
  .min(LIMITS.PHONE_NUMBER_MIN_LENGTH, 'Phone number is too short')
  .regex(/^\+?[0-9]+$/, 'Invalid phone number format');

export const otpSchema = z
  .string()
  .length(LIMITS.OTP_LENGTH, `OTP must be ${LIMITS.OTP_LENGTH} digits`)
  .regex(/^[0-9]+$/, 'OTP must contain only digits');

export const userCreateSchema = z.object({
  phone: phoneNumberSchema,
  displayName: z
    .string()
    .trim()
    .min(LIMITS.DISPLAY_NAME_MIN_LENGTH, 'Name is too short')
    .max(LIMITS.DISPLAY_NAME_MAX_LENGTH, 'Name is too long'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

import { z } from 'zod'

export const UpdateUserSchema = z.object({
  first_name: z.string().min(1).max(255).optional(),
  last_name:  z.string().min(1).max(255).optional(),
  avatar_id:  z.number().int().positive().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
)

export const UpdatePreferencesSchema = z.object({
  budget_range: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }).refine((data) => data.max >= data.min, {
    message: 'max must be >= min',
  }).optional(),

  dietary_restrictions: z.array(z.string().min(1)).optional(),

  interests: z.array(z.string().min(1)).optional(),

  preferred_currency: z.enum(['USD', 'EUR', 'MXN', 'JPY', 'GBP', 'THB']).optional(),

  preferred_language: z.enum(['es', 'en']).optional(),

  email_preferences: z.object({
    draft_reminder:  z.boolean().optional(),
    trip_upcoming:   z.boolean().optional(),
    archive_warning: z.boolean().optional(),
  }).optional(),
})


export const UserResponseSchema = z.object({
  user_id:      z.string().uuid(),
  email:        z.string().email(),
  first_name:   z.string(),
  last_name:    z.string(),
  role:         z.enum(['USER', 'ADMIN']),
  status:       z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  created_at:   z.coerce.date(),
  updated_at:   z.coerce.date(),
  avatar_name:  z.string().nullable(),
  avatar_url:   z.string().url().nullable(),
  provider:     z.enum(['LOCAL', 'GOOGLE', 'APPLE']),
})

export const PreferencesResponseSchema = z.object({
  preference_id:        z.string().uuid(),
  budget_range:         z.object({
    min: z.number(),
    max: z.number(),
  }).nullable(),
  dietary_restrictions: z.array(z.string()).nullable(),
  interests:            z.array(z.string()).nullable(),
  preferred_currency:   z.string(),
  preferred_language:   z.string(),
  email_preferences:    z.object({
    draft_reminder:  z.boolean(),
    trip_upcoming:   z.boolean(),
    archive_warning: z.boolean(),
  }).nullable(),
  updated_at:           z.coerce.date(),
})


export type UpdateUserInput       = z.infer<typeof UpdateUserSchema>
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>
export type UserResponse          = z.infer<typeof UserResponseSchema>
export type PreferencesResponse   = z.infer<typeof PreferencesResponseSchema>
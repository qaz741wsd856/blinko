import { Prisma } from "@prisma/client"
import { z } from "zod"

/////////////////////////////////////////
// ACCOUNTS SCHEMA
/////////////////////////////////////////

export const accountsSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  nickname: z.string(),
  password: z.string(),
  image: z.string(),
  apiToken: z.string(),
  note: z.number().int(),
  role: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type accounts = z.infer<typeof accountsSchema>

/////////////////////////////////////////
// ATTACHMENTS SCHEMA
/////////////////////////////////////////

export const attachmentsSchema = z.object({
  id: z.number().int(),
  isShare: z.boolean(),
  sharePassword: z.string(),
  name: z.string(),
  path: z.string(),
  size: z.instanceof(Prisma.Decimal, { message: "Field 'size' must be a Decimal. Location: ['Models', 'attachments']" }),
  noteId: z.number().int(),
  createdAt: z.coerce.date(),
  sortOrder: z.number().int(),
  updatedAt: z.coerce.date(),
  type: z.string(),
  depth: z.any(),
  perfixPath: z.any(),
})

export type attachments = z.infer<typeof attachmentsSchema>

/////////////////////////////////////////
// CONFIG SCHEMA
/////////////////////////////////////////

export const configSchema = z.object({
  id: z.number().int(),
  key: z.string(),
  config: z.any(),
})

export type config = z.infer<typeof configSchema>

/////////////////////////////////////////
// NOTES SCHEMA
/////////////////////////////////////////

export const notesSchema = z.object({
  id: z.number().int(),
  type: z.number().int(),
  content: z.string(),
  isArchived: z.boolean(),
  isRecycle: z.boolean(),
  isShare: z.boolean(),
  isTop: z.boolean(),
  isReviewed: z.boolean(),
  sharePassword: z.string(),
  metadata: z.any(),
  accountId: z.union([z.number().int(), z.null()]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type notes = z.infer<typeof notesSchema>

/////////////////////////////////////////
// TAG SCHEMA
/////////////////////////////////////////

export const tagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  icon: z.string(),
  parent: z.number().int(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type tag = z.infer<typeof tagSchema>

/////////////////////////////////////////
// TAGS TO NOTE SCHEMA
/////////////////////////////////////////

export const tagsToNoteSchema = z.object({
  id: z.number().int(),
  noteId: z.number().int(),
  tagId: z.number().int(),
})

export type tagsToNote = z.infer<typeof tagsToNoteSchema>

/////////////////////////////////////////
// SCHEDULED TASK SCHEMA
/////////////////////////////////////////

export const scheduledTaskSchema = z.object({
  name: z.string(),
  schedule: z.string(),
  lastRun: z.coerce.date(),
  isSuccess: z.boolean(),
  isRunning: z.boolean(),
  output: z.any(),
})

export type scheduledTask = z.infer<typeof scheduledTaskSchema>

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// ACCOUNTS
//------------------------------------------------------

export const accountsSelectSchema: z.ZodType<Prisma.accountsSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  nickname: z.boolean().optional(),
  password: z.boolean().optional(),
  image: z.boolean().optional(),
  apiToken: z.boolean().optional(),
  note: z.boolean().optional(),
  role: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
}).strict()

// ATTACHMENTS
//------------------------------------------------------


// CONFIG
//------------------------------------------------------

export const configSelectSchema: z.ZodType<Prisma.configSelect> = z.object({
  id: z.boolean().optional(),
  key: z.boolean().optional(),
  config: z.boolean().optional(),
}).strict()


// NOTE REFERENCE
//------------------------------------------------------

export const noteReferenceSchema = z.object({
  id: z.number().int(),
  fromNoteId: z.number().int(),
  toNoteId: z.number().int(),
})

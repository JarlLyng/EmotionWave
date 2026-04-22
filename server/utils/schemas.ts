import { z } from 'zod'

// ─── Reddit ──────────────────────────────────────────────────────────────────
export const RedditPostSchema = z.object({
  data: z.object({
    title: z.string(),
    selftext: z.string().optional().nullable(),
    score: z.number().catch(0),
    permalink: z.string(),
    created_utc: z.number(),
  }),
})

export const RedditResponseSchema = z.object({
  data: z.object({
    children: z.array(RedditPostSchema).catch([]),
  }).catch({ children: [] }),
})

// ─── NewsAPI ─────────────────────────────────────────────────────────────────
export const NewsAPIArticleSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  source: z.object({
    name: z.string().optional().nullable(),
  }).optional().nullable(),
  publishedAt: z.string().optional().nullable(),
})

export const NewsAPIResponseSchema = z.object({
  status: z.string(),
  articles: z.array(NewsAPIArticleSchema).optional(),
})

// ─── HuggingFace ─────────────────────────────────────────────────────────────
export const HuggingFaceLabelSchema = z.object({
  label: z.string(),
  score: z.number(),
})

// HF can return a flat array, an array of arrays, or a single object depending on the model/endpoint
export const HuggingFaceResponseSchema = z.union([
  z.array(z.array(HuggingFaceLabelSchema)),
  z.array(HuggingFaceLabelSchema),
  HuggingFaceLabelSchema,
  z.any() // Fallback to handle error responses explicitly if needed, though we check `response.ok`
])

// ─── GDELT ───────────────────────────────────────────────────────────────────
// GDELT responses are wildly inconsistent. We'll define a loose schema for individual articles.
export const GDELTArticleSchema = z.object({
  title: z.string().optional().nullable(),
  seo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sentiment: z.number().optional().nullable(),
  tone: z.number().optional().nullable(),
  avgtone: z.number().optional().nullable(),
  url: z.string().optional().nullable(),
  shareurl: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
}).passthrough() // Allow other fields

// Since GDELT can return array directly or wrapped in objects
export const GDELTResponseSchema = z.union([
  z.array(GDELTArticleSchema),
  z.object({ articles: z.array(GDELTArticleSchema) }).passthrough(),
  z.object({ results: z.array(GDELTArticleSchema) }).passthrough(),
  z.object({ docs: z.array(GDELTArticleSchema) }).passthrough(),
])

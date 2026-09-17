import { z } from 'zod';

import { formatZodError } from './format-zod-error';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

// One degree (full or associate). Title/summary/description carry
// optional Spanish siblings; institution + skills[] stay literal
// (institution is a proper noun; skill chips are tech names).
const degree = z.object({
  title: z.string().min(1),
  title_es: z.string().optional(),
  startDate: yearMonth,
  endDate: yearMonth,
  institution: z.string().min(1),
  summary: z.string(),
  summary_es: z.string().optional(),
  description: z.string(),
  description_es: z.string().optional(),
  skills: z.array(z.string()).min(1),
});

const certification = z.object({
  title: z.string().min(1),
  title_es: z.string().optional(),
  startDate: yearMonth,
  institution: z.string().min(1),
  description: z.string(),
  description_es: z.string().optional(),
  // Either a full URL (external issuer's verification page) or a
  // site-relative path starting with `/` (a certificate PDF committed
  // under `public/assets/files/`). The consumer renders it verbatim
  // inside a `target="_blank"` link, so both open in a new tab.
  url: z
    .string()
    .refine((v) => /^(https?:\/\/|\/)/.test(v), {
      message: 'Expected a full URL (https://…) or a site-relative path starting with /',
    })
    .optional(),
  // When true, the certification renders with the "Currently studying"
  // badge — matches how in-progress degrees are surfaced. Degrees infer
  // in-progress state from `endDate > todayYearMonth`; certifications
  // don't have `endDate` on the schema, so this is an explicit flag on
  // the JSON side. Set to `true` for in-flight programs; leave undefined
  // for completed certifications.
  inProgress: z.boolean().optional(),
});

const schemaMeta = z
  .object({
    version: z.number(),
    description: z.string().optional(),
    notes: z.array(z.string()).optional(),
  })
  .optional();

const EducationSchema = z.object({
  _schema: schemaMeta,
  degree,
  associateDegree: degree,
  certifications: z.array(certification),
});

export function loadEducation(raw: unknown): z.infer<typeof EducationSchema> {
  const result = EducationSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(formatZodError('education.json', result.error));
  }
  return result.data;
}

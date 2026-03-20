import "server-only";

import { z } from "zod";

const resendApiKeySchema = z.object({
  RESEND_API_KEY: z.string().min(1),
});

const resendConfigSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
});

const resendErrorSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

const resendContactSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  created_at: z.string(),
  unsubscribed: z.boolean(),
  properties: z.record(z.string(), z.string()).optional(),
});

const resendSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
});

const resendContactSegmentsSchema = z.object({
  data: z.array(resendSegmentSchema),
});

const resendMutationSchema = z.object({
  id: z.string(),
});

export type ResendEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type ResendConfig = {
  apiKey: string;
  fromEmail: string;
};

export type ResendContact = {
  id: string;
  email: string;
  unsubscribed: boolean;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  properties: Record<string, string>;
};

export type ResendSegment = {
  id: string;
  name: string;
  createdAt: string;
};

type CreateResendContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  properties?: Record<string, string>;
};

type UpdateResendContactInput = CreateResendContactInput;

export class ResendApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ResendApiError";
    this.status = status;
  }
}

function buildResendHeaders(apiKey: string, includeContentType = true): HeadersInit {
  return includeContentType
    ? {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }
    : {
        Authorization: `Bearer ${apiKey}`,
      };
}

async function parseResendError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    const parsed = resendErrorSchema.safeParse(payload);
    if (parsed.success) {
      return parsed.data.message ?? parsed.data.error ?? `Resend request failed with status ${response.status}`;
    }
  } catch {
    // Ignore parse failures and fall back to status-based messaging.
  }

  return `Resend request failed with status ${response.status}`;
}

async function resendJsonRequest<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new ResendApiError(503, "Resend API key is not configured");
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: init.headers ?? buildResendHeaders(apiKey),
  });

  if (!response.ok) {
    throw new ResendApiError(response.status, await parseResendError(response));
  }

  return schema.parse(await response.json());
}

function toResendContact(contact: z.infer<typeof resendContactSchema>): ResendContact {
  return {
    id: contact.id,
    email: contact.email,
    unsubscribed: contact.unsubscribed,
    firstName: contact.first_name ?? null,
    lastName: contact.last_name ?? null,
    createdAt: contact.created_at,
    properties: contact.properties ?? {},
  };
}

function toResendSegment(segment: z.infer<typeof resendSegmentSchema>): ResendSegment {
  return {
    id: segment.id,
    name: segment.name,
    createdAt: segment.created_at,
  };
}

export function getResendApiKey(): string | null {
  const result = resendApiKeySchema.safeParse(process.env);
  if (!result.success) {
    return null;
  }

  return result.data.RESEND_API_KEY;
}

export function getResendConfig(): ResendConfig | null {
  const result = resendConfigSchema.safeParse(process.env);
  if (!result.success) {
    return null;
  }

  return {
    apiKey: result.data.RESEND_API_KEY,
    fromEmail: result.data.RESEND_FROM_EMAIL,
  };
}

export async function getResendContactByEmail(email: string): Promise<ResendContact | null> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
    method: "GET",
    headers: buildResendHeaders(apiKey, false),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ResendApiError(response.status, await parseResendError(response));
  }

  return toResendContact(resendContactSchema.parse(await response.json()));
}

export async function createResendContact(input: CreateResendContactInput): Promise<{ id: string }> {
  return resendJsonRequest(
    "/contacts",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        unsubscribed: input.unsubscribed,
        properties: input.properties,
      }),
    },
    resendMutationSchema,
  );
}

export async function updateResendContactByEmail(input: UpdateResendContactInput): Promise<{ id: string }> {
  return resendJsonRequest(
    `/contacts/${encodeURIComponent(input.email)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        first_name: input.firstName,
        last_name: input.lastName,
        unsubscribed: input.unsubscribed,
        properties: input.properties,
      }),
    },
    resendMutationSchema,
  );
}

export async function listResendContactSegmentsByEmail(email: string): Promise<ResendSegment[]> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new ResendApiError(503, "Resend API key is not configured");
  }

  const payload = await resendJsonRequest(
    `/contacts/${encodeURIComponent(email)}/segments`,
    {
      method: "GET",
      headers: buildResendHeaders(apiKey, false),
    },
    resendContactSegmentsSchema,
  );

  return payload.data.map(toResendSegment);
}

export async function addResendContactToSegmentByEmail(email: string, segmentId: string): Promise<{ id: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new ResendApiError(503, "Resend API key is not configured");
  }

  return resendJsonRequest(
    `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
    {
      method: "POST",
      headers: buildResendHeaders(apiKey, false),
    },
    resendMutationSchema,
  );
}

export async function sendResendEmail(message: ResendEmailMessage): Promise<"sent" | "skipped"> {
  const config = getResendConfig();
  if (!config) {
    return "skipped";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: buildResendHeaders(config.apiKey),
    body: JSON.stringify({
      from: config.fromEmail,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email request failed with status ${response.status}`);
  }

  return "sent";
}

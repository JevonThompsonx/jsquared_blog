# Feature Plan: [Feature Name]

**Task ID**: [from PLAN.md, e.g., 2.1]
**Owner**: [Opus (plan) → Sonnet (backend) → Gemini (frontend)]
**Status**: Draft | Approved | In Progress | Complete

---

## Goal

One-paragraph description of what this feature does and why.

## Schema Changes

```sql
-- Drizzle schema additions/modifications (if any)
-- Use --> statement-breakpoint delimiters in migrations
```

## Server Actions / API Routes

```typescript
// Function signatures with full types
// e.g.:
// export async function bulkPublishPosts(postIds: string[]): Promise<{ updated: number }>
```

## Component Tree

```
PageComponent (server)
  └── ClientWrapper ("use client")
      ├── FeatureList
      └── FeatureItem
```

## Data Flow

```
Server Component → DAL query → props → Client Component → server action → DAL mutation
```

## Test Plan

- [ ] Unit: DAL function returns correct shape
- [ ] Unit: Zod schema rejects invalid input
- [ ] Integration: API route with auth
- [ ] E2E: Playwright smoke test

## Open Questions

- None yet

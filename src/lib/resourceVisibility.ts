export const resourceVisibilityValues = ["public", "student"] as const;

export type ResourceVisibility = (typeof resourceVisibilityValues)[number];

export function normalizeResourceVisibility(value?: string | null): ResourceVisibility {
  return value === "public" ? "public" : "student";
}

export function formatResourceVisibility(value: ResourceVisibility): string {
  return value === "public" ? "Public library" : "Student portal";
}
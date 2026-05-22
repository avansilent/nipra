const programCourseIds: Record<string, string[]> = {
  "program-foundation": ["primary"],
  "program-middle": ["middle-school"],
  "program-board": ["secondary-board"],
  "program-senior": ["senior-science", "senior-commerce", "senior-arts"],
};

function createProgramHref(programId: string, intent?: "buy") {
  const query = new URLSearchParams();

  if (programCourseIds[programId]) {
    query.set("program", programId);
  }

  if (intent) {
    query.set("intent", intent);
  }

  const suffix = query.toString();
  return suffix ? `/courses?${suffix}#catalog` : "/courses#catalog";
}

export function getProgramBuyHref(programId: string) {
  return createProgramHref(programId, "buy");
}

export function getProgramExploreHref(programId: string) {
  return createProgramHref(programId);
}

export function getProgramCourseIds(programId?: string | null) {
  if (!programId) {
    return [];
  }

  return programCourseIds[programId] ?? [];
}

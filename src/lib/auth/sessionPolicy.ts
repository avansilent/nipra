export const rememberedStudentSessionDays = 30;

export const rememberedStudentSessionMaxAgeSeconds =
  rememberedStudentSessionDays * 24 * 60 * 60;

export const rememberedStudentSessionMaxAgeMs =
  rememberedStudentSessionMaxAgeSeconds * 1000;

export const rememberedStudentSessionStorageKey =
  "nipra-student-session-active-at-v1";

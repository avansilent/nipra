export type TestQuestionInput = {
  id?: string;
  prompt?: unknown;
  options?: unknown;
  correctOptionIndex?: unknown;
  correct_option_index?: unknown;
  marks?: unknown;
  explanation?: unknown;
  sortOrder?: unknown;
  sort_order?: unknown;
};

export type NormalizedTestQuestion = {
  prompt: string;
  options: string[];
  correct_option_index: number;
  marks: number;
  explanation: string | null;
  sort_order: number;
};

export type TestQuestionRow = NormalizedTestQuestion & {
  id: string;
  test_id: string;
  institute_id: string;
};

export type PublicTestQuestion = {
  id: string;
  prompt: string;
  options: string[];
  marks: number;
  sort_order: number;
};

export type AnswerMap = Record<string, number>;

export const maxMcqQuestions = 100;
export const maxMcqOptions = 6;

export function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function numberField(value: unknown, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

export function booleanField(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const text = stringField(value).toLowerCase();
  if (text === "true" || text === "1" || text === "yes" || text === "on") {
    return true;
  }
  if (text === "false" || text === "0" || text === "no" || text === "off") {
    return false;
  }

  return fallback;
}

function normalizeOptions(value: unknown) {
  const rawOptions = Array.isArray(value) ? value : [];
  return rawOptions
    .map((option) => stringField(option))
    .filter(Boolean)
    .slice(0, maxMcqOptions);
}

export function normalizeQuestionInput(
  value: TestQuestionInput,
  index: number,
  defaultMarks: number
): NormalizedTestQuestion {
  const prompt = stringField(value.prompt);
  const options = normalizeOptions(value.options);
  const correctOptionIndex = Math.trunc(
    numberField(value.correctOptionIndex ?? value.correct_option_index, -1)
  );
  const marks = numberField(value.marks, defaultMarks);

  if (!prompt) {
    throw new Error(`Question ${index + 1} needs question text.`);
  }

  if (options.length < 2) {
    throw new Error(`Question ${index + 1} needs at least two options.`);
  }

  if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
    throw new Error(`Question ${index + 1} needs a valid correct option.`);
  }

  if (!Number.isFinite(marks) || marks <= 0 || marks > 100) {
    throw new Error(`Question ${index + 1} marks must be between 1 and 100.`);
  }

  return {
    prompt,
    options,
    correct_option_index: correctOptionIndex,
    marks: Math.round(marks * 100) / 100,
    explanation: stringField(value.explanation) || null,
    sort_order: Math.trunc(numberField(value.sortOrder ?? value.sort_order, index)),
  };
}

export function normalizeQuestionsInput(values: unknown, defaultMarks: number) {
  const rawQuestions = Array.isArray(values) ? values : [];

  if (rawQuestions.length === 0) {
    throw new Error("Add at least one MCQ question.");
  }

  if (rawQuestions.length > maxMcqQuestions) {
    throw new Error(`A test can have maximum ${maxMcqQuestions} questions.`);
  }

  return rawQuestions.map((question, index) =>
    normalizeQuestionInput((question ?? {}) as TestQuestionInput, index, defaultMarks)
  );
}

export function sanitizeQuestionForStudent(question: TestQuestionRow): PublicTestQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    marks: Number(question.marks ?? 1),
    sort_order: Number(question.sort_order ?? 0),
  };
}

export function normalizeAnswerMap(value: unknown): AnswerMap {
  const answers = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(answers)
      .map(([questionId, answer]) => [questionId, Math.trunc(numberField(answer, -1))] as const)
      .filter(([questionId, answer]) => questionId && answer >= 0)
  );
}

export function scoreAnswers(questions: TestQuestionRow[], answers: AnswerMap) {
  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0);
  let score = 0;
  let correctCount = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    if (typeof answer === "number" && answer === Number(question.correct_option_index)) {
      score += Number(question.marks ?? 0);
      correctCount += 1;
    }
  }

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;

  return {
    score: Math.round(score * 100) / 100,
    totalMarks: Math.round(totalMarks * 100) / 100,
    percentage,
    correctCount,
    questionCount: questions.length,
  };
}

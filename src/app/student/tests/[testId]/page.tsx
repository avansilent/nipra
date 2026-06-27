import type { Metadata } from "next";
import StudentTestRunner from "../../../../components/student/StudentTestRunner";

export const metadata: Metadata = {
  title: "Student Test | Nipracademy",
  description: "Attend a secure Nipracademy MCQ test and save your score to the student dashboard.",
};

type StudentTestPageProps = {
  params: Promise<{ testId: string }>;
};

export default async function StudentTestPage({ params }: StudentTestPageProps) {
  const { testId } = await params;
  return <StudentTestRunner testId={testId} />;
}

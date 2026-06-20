import type { Metadata } from "next";
import ResourceLibrary from "../../components/ResourceLibrary";
import { fetchPublicBooksLibrary } from "../../lib/publicResources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Books & Reference PDFs | Nipracademy",
  description:
    "Reference books and PDFs for enrolled Nipracademy students. Login to access course materials in your student dashboard.",
};

export default async function BooksPage() {
  const books = await fetchPublicBooksLibrary();

  return (
    <ResourceLibrary
      eyebrow="Books Library"
      title="Books and reference PDFs by course."
      description="Browse public books and reference PDFs, preview the first page, and open or download any file directly from the library."
      searchPlaceholder="Search books or course name"
      emptyTitle="Student portal materials"
      emptyDescription="Study materials are available exclusively inside the student portal after enrollment. Login to your dashboard to access course-specific notes, books, and resources."
      items={books}
      downloadKind="material"
      surfaceLabel="Books"
    />
  );
}

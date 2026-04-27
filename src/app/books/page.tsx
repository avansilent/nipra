import ResourceLibrary from "../../components/ResourceLibrary";
import { fetchPublicBooksLibrary } from "../../lib/publicResources";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await fetchPublicBooksLibrary();

  return (
    <ResourceLibrary
      eyebrow="Books Library"
      title="Books and reference PDFs by course."
      description="Browse public books and reference PDFs, preview the first page, and open or download any file directly from the library."
      searchPlaceholder="Search books or course name"
      emptyTitle="No public books available yet"
      emptyDescription="Public books uploaded by the admin will appear here automatically for viewing and download."
      items={books}
      downloadKind="material"
      surfaceLabel="Books"
    />
  );
}

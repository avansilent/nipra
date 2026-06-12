import type { Metadata } from "next";
import ResourceLibrary from "../../components/ResourceLibrary";
import { fetchPublicNotesLibrary } from "../../lib/publicResources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes Library | Nipracademy",
  description: "Access public revision notes and course-wise study PDFs from Nipracademy.",
};

export default async function NotesPage() {
  const notes = await fetchPublicNotesLibrary();

  return (
    <ResourceLibrary
      eyebrow="Notes Library"
      title="Notes for revision and course-wise study."
      description="Browse public notes by course, preview the first page, and open or download the PDF when you need it."
      searchPlaceholder="Search notes or course name"
      emptyTitle="No public notes available yet"
      emptyDescription="Public notes uploaded by the admin will appear here automatically for viewing and download."
      items={notes}
      downloadKind="note"
      surfaceLabel="Notes"
    />
  );
}

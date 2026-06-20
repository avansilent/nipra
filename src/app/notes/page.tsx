import type { Metadata } from "next";
import ResourceLibrary from "../../components/ResourceLibrary";
import { fetchPublicNotesLibrary } from "../../lib/publicResources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study Notes | Nipracademy Student Portal",
  description:
    "Course-specific study notes available inside the Nipracademy student portal. Login or enroll to access your materials.",
};

export default async function NotesPage() {
  const notes = await fetchPublicNotesLibrary();

  return (
    <ResourceLibrary
      eyebrow="Notes Library"
      title="Notes for revision and course-wise study."
      description="Browse public notes by course, preview the first page, and open or download the PDF when you need it."
      searchPlaceholder="Search notes or course name"
      emptyTitle="Student portal materials"
      emptyDescription="Study materials are available exclusively inside the student portal after enrollment. Login to your dashboard to access course-specific notes, books, and resources."
      items={notes}
      downloadKind="note"
      surfaceLabel="Notes"
    />
  );
}

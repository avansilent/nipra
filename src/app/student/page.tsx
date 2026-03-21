import { redirect } from "next/navigation";

export default function StudentEntryPage() {
  redirect("/login?type=student");
}

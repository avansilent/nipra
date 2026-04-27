export type AdminTab = "overview" | "students" | "operations" | "resources" | "website" | "settings";

export const adminTabs: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Executive summary and fast actions" },
  { id: "students", label: "Students", description: "Accounts, credentials, and onboarding" },
  { id: "operations", label: "Operations", description: "Courses, tests, results, and enrollment" },
  { id: "resources", label: "Resources", description: "Notes, materials, and announcements" },
  { id: "website", label: "Website", description: "Hero copy, FAQs, and public messaging" },
  { id: "settings", label: "Settings", description: "Branding, contact, and metadata" },
];
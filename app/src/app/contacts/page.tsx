import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";
import ContactsTable from "@/components/hub/ContactsTable";

export default function ContactsPage() {
  return (
    <HubShell
      title="Contacts"
      description="Searchable CRM for sponsors, donors, members, alumni, vendors, and participants."
    >
      <ContactsTable />

      <div className="mt-4">
      <ModulePlaceholder
        what="Single source of truth for all relationship data and interaction history."
        now={[
          "Supabase-backed contacts list is now live",
          "Client-side search supports quick filtering",
          "Permissions utilities can enforce role-based edits",
        ]}
        next={[
          "Add contact type and company filters",
          "Build contact profile detail page",
          "Wire write flows for board/member roles",
        ]}
      />
      </div>
    </HubShell>
  );
}

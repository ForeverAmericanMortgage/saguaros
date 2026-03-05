"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company: string | null;
  contact_type: string;
  created_at: string;
}

export default function ContactsTable() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadContacts() {
      if (!supabase) {
        setError("Missing Supabase environment values. Add .env.local credentials to load contacts.");
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, company, contact_type, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setContacts(data ?? []);
      setLoading(false);
    }

    void loadContacts();
  }, [supabase]);

  const filteredContacts = contacts.filter((contact) => {
    const haystack = [
      contact.first_name,
      contact.last_name,
      contact.email ?? "",
      contact.company ?? "",
      contact.contact_type,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query.toLowerCase());
  });

  return (
    <section className="bg-warm-white border border-sand rounded-lg p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <p className="font-display font-bold text-xl">Contacts</p>
          <p className="text-sm text-forest/55">Latest 100 records from the CRM table.</p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, company, or type"
          className="w-full md:w-80 px-3 py-2 border border-sand rounded-md bg-cream text-sm text-forest placeholder:text-forest/35"
        />
      </div>

      {loading ? (
        <p className="text-sm text-forest/60">Loading contacts...</p>
      ) : error ? (
        <p className="text-sm text-terracotta bg-terracotta/5 border border-terracotta/30 rounded-md p-3">{error}</p>
      ) : filteredContacts.length === 0 ? (
        <p className="text-sm text-forest/60">No contacts match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-sand">
                <th className="py-2 pr-3 font-display">Name</th>
                <th className="py-2 pr-3 font-display">Email</th>
                <th className="py-2 pr-3 font-display">Company</th>
                <th className="py-2 pr-3 font-display">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-sand/60">
                  <td className="py-2 pr-3 text-forest">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="py-2 pr-3 text-forest/70">{contact.email ?? "-"}</td>
                  <td className="py-2 pr-3 text-forest/70">{contact.company ?? "-"}</td>
                  <td className="py-2 pr-3 text-forest/70 capitalize">{contact.contact_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
"use server";

import { createServerClient } from "@/lib/supabase-server";
import { subscribeToMailchimp } from "@/lib/mailchimp";

interface LeadResult {
  success: boolean;
  message: string;
}

export async function submitLead(formData: FormData): Promise<LeadResult> {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const phone = formData.get("phone")?.toString().trim() || null;
  const platePreference = formData.get("plate_preference")?.toString() || null;

  // Validation
  if (!name || name.length < 2) {
    return { success: false, message: "Please enter your name." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  const supabase = createServerClient();

  // Insert into Supabase
  const { error } = await supabase.from("plate_leads").insert({
    name,
    email,
    phone,
    plate_preference: platePreference,
  });

  let alreadyOnList = false;

  if (error) {
    // Duplicate email — treat as success (they're already on the list)
    if (error.code === "23505") {
      alreadyOnList = true;
    } else {
      console.error("Lead insert error:", error);
      return { success: false, message: "Something went wrong. Please try again." };
    }
  }

  // Mailchimp — best effort so repeat signups can backfill previously unsynced contacts.
  try {
    await subscribeToMailchimp({
      name,
      email,
      phone,
      platePreference,
    });
  } catch (err) {
    console.error("Mailchimp subscription failed (non-fatal):", err);
  }

  if (alreadyOnList) {
    return { success: true, message: "You're already on the list. We'll be in touch!" };
  }

  return {
    success: true,
    message: "You're in. We'll let you know the moment it's live.",
  };
}

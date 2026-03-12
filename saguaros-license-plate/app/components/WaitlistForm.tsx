"use client";

import { useActionState } from "react";
import { submitLead } from "@/app/actions/submitLead";

const initialState = { success: false, message: "" };

export default function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      return submitLead(formData);
    },
    initialState
  );

  return (
    <form action={formAction} className="w-full max-w-md mx-auto">
      <div className="space-y-3">
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className="w-full bg-card border border-border-light rounded-lg px-4 py-3 text-sm text-pure-white placeholder:text-muted focus:outline-none focus:border-gray transition-colors"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          className="w-full bg-card border border-border-light rounded-lg px-4 py-3 text-sm text-pure-white placeholder:text-muted focus:outline-none focus:border-gray transition-colors"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="tel"
            name="phone"
            placeholder="Phone (optional)"
            className="bg-card border border-border-light rounded-lg px-4 py-3 text-sm text-pure-white placeholder:text-muted focus:outline-none focus:border-gray transition-colors"
          />
          <select
            name="plate_preference"
            className="bg-card border border-border-light rounded-lg px-4 py-3 text-sm text-pure-white focus:outline-none focus:border-gray transition-colors appearance-none"
          >
            <option value="">Plate type...</option>
            <option value="standard">Standard ($25/yr)</option>
            <option value="vanity">Custom Vanity ($50/yr)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-pure-white text-black py-3 rounded-lg text-sm font-semibold tracking-wide uppercase hover:bg-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Joining..." : "Join the Waitlist"}
        </button>
      </div>

      {state.message && (
        <p
          className={`mt-3 text-center text-sm ${
            state.success ? "text-green-400" : "text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

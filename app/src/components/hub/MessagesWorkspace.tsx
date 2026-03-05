"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ChannelRow {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
}

interface MessageRow {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

function isMissingMessagingTable(errorMessage: string) {
  return (
    errorMessage.includes("Could not find the table 'public.channels'") ||
    errorMessage.includes("Could not find the table 'public.messages'") ||
    errorMessage.includes('relation "public.channels" does not exist') ||
    errorMessage.includes('relation "public.messages" does not exist')
  );
}

const demoChannels: ChannelRow[] = [
  {
    id: "demo-general",
    name: "General (Demo)",
    description: "Messaging schema not migrated yet. This is local demo mode.",
    channel_type: "club_wide",
  },
  {
    id: "demo-board",
    name: "Board (Demo)",
    description: "Run migration 20260305_000002_operational_modules.sql to enable real channels.",
    channel_type: "board",
  },
];

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function MessagesWorkspace() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [setupRequiredMessage, setSetupRequiredMessage] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [senderProfiles, setSenderProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    async function loadCurrentUser() {
      if (!supabase) return;
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) return;

      setCurrentUserId(data.user.id);
      const metadata = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
      setCurrentUserName(metadata?.full_name || metadata?.name || "");
      setCurrentUserEmail(data.user.email ?? "");
    }

    void loadCurrentUser();
  }, [supabase]);

  useEffect(() => {
    async function loadChannels() {
      if (!supabase) {
        setError("Missing Supabase environment values. Add .env.local credentials to use messaging.");
        setLoadingChannels(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("channels")
        .select("id, name, description, channel_type")
        .eq("is_archived", false)
        .order("name", { ascending: true });

      if (loadError) {
        if (isMissingMessagingTable(loadError.message)) {
          setDemoMode(true);
          setSetupRequiredMessage(
            "Messaging setup required: run migration 20260305_000002_operational_modules.sql in Supabase to create channels/messages tables."
          );
          setChannels(demoChannels);
          setSelectedChannelId("demo-general");
          setLoadingChannels(false);
          return;
        }
        setError(loadError.message);
        setLoadingChannels(false);
        return;
      }

      const rows = (data ?? []) as ChannelRow[];
      setChannels(rows);
      setSelectedChannelId((current) => current || rows[0]?.id || "");
      setLoadingChannels(false);
    }

    void loadChannels();
  }, [supabase]);

  useEffect(() => {
    async function loadMessages() {
      if (!supabase || !selectedChannelId) {
        setMessages([]);
        return;
      }

      if (demoMode) {
        setMessages((current) => current);
        return;
      }

      setLoadingMessages(true);
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("id, channel_id, sender_id, content, created_at")
        .eq("channel_id", selectedChannelId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (loadError) {
        if (isMissingMessagingTable(loadError.message)) {
          setDemoMode(true);
          setSetupRequiredMessage(
            "Messaging setup required: run migration 20260305_000002_operational_modules.sql in Supabase to create channels/messages tables."
          );
          setMessages([
            {
              id: "demo-msg-1",
              channel_id: selectedChannelId,
              sender_id: "demo-user",
              content: "Demo mode is active. Apply migration 20260305_000002_operational_modules.sql for real messaging.",
              created_at: new Date().toISOString(),
            },
          ]);
          setLoadingMessages(false);
          return;
        }
        setError(loadError.message);
        setLoadingMessages(false);
        return;
      }

      setMessages((data ?? []) as MessageRow[]);
      setUnreadByChannel((current) => ({ ...current, [selectedChannelId]: 0 }));
      setLoadingMessages(false);
    }

    void loadMessages();
  }, [supabase, selectedChannelId, demoMode]);

  useEffect(() => {
    async function loadSenderProfiles() {
      if (!supabase || demoMode || messages.length === 0) return;

      const missingSenderIds = [...new Set(messages.map((m) => m.sender_id))].filter(
        (senderId) => !senderProfiles[senderId]
      );

      if (missingSenderIds.length === 0) return;

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", missingSenderIds);

      if (profilesError) return;

      const rows = (data ?? []) as ProfileRow[];
      if (rows.length === 0) return;

      setSenderProfiles((current) => {
        const next = { ...current };
        for (const row of rows) {
          next[row.id] = row;
        }
        return next;
      });
    }

    void loadSenderProfiles();
  }, [supabase, messages, demoMode, senderProfiles]);

  useEffect(() => {
    if (!supabase || !selectedChannelId) return;
    if (demoMode) return;

    const subscription = supabase
      .channel(`messages-${selectedChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((current) => {
            if (current.some((message) => message.id === row.id)) {
              return current;
            }
            return [...current, row];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [supabase, selectedChannelId, demoMode]);

  useEffect(() => {
    if (!supabase) return;
    if (demoMode) return;

    const subscription = supabase
      .channel("messages-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as MessageRow;
          if (row.channel_id === selectedChannelId) return;
          setUnreadByChannel((current) => ({
            ...current,
            [row.channel_id]: (current[row.channel_id] ?? 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [supabase, selectedChannelId, demoMode]);

  const sendMessage = async () => {
    if (!supabase || !selectedChannelId || !draft.trim()) return;
    setError("");

    if (demoMode) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          channel_id: selectedChannelId,
          sender_id: "demo-user",
          content: draft.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      setDraft("");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sign in first to send messages.");
      return;
    }

    // Ensure the sender is marked as a member of the channel so RLS permits insert.
    const { error: membershipError } = await supabase
      .from("channel_members")
      .upsert(
        {
          channel_id: selectedChannelId,
          user_id: userData.user.id,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: "channel_id,user_id",
          ignoreDuplicates: false,
        }
      );

    if (membershipError) {
      setError(membershipError.message);
      return;
    }

    const outbound = draft.trim();

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        channel_id: selectedChannelId,
        sender_id: userData.user.id,
        content: outbound,
      })
      .select("id, channel_id, sender_id, content, created_at")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (insertedMessage) {
      setMessages((current) => {
        if (current.some((message) => message.id === insertedMessage.id)) {
          return current;
        }
        return [...current, insertedMessage as MessageRow];
      });
    }

    setDraft("");

    // Safety refresh: keeps UI in sync even if realtime subscription is delayed.
    const { data: refreshedMessages, error: refreshError } = await supabase
      .from("messages")
      .select("id, channel_id, sender_id, content, created_at")
      .eq("channel_id", selectedChannelId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!refreshError) {
      setMessages((refreshedMessages ?? []) as MessageRow[]);
    }
  };

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? null;

  const getSenderLabel = (senderId: string) => {
    if (senderId === currentUserId) {
      return currentUserName || currentUserEmail || "You";
    }

    const profile = senderProfiles[senderId];
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) return profile.email;
    return senderId.slice(0, 8);
  };

  const getSenderSubLabel = (senderId: string) => {
    if (senderId === currentUserId) {
      return currentUserEmail || "You";
    }

    const profile = senderProfiles[senderId];
    if (profile?.email) return profile.email;
    return `id:${senderId.slice(0, 8)}`;
  };

  const getInitials = (senderId: string) => {
    const label = getSenderLabel(senderId);
    const letters = label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    return letters || "S";
  };

  return (
    <section className="bg-warm-white border border-sand rounded-lg overflow-hidden shadow-[0_8px_30px_rgba(15,26,19,0.08)]">
      <div className="grid lg:grid-cols-[280px_1fr] min-h-[560px]">
        <aside className="border-r border-sand p-4 bg-gradient-to-b from-warm-white to-cream/70">
          <p className="font-display font-bold text-lg mb-1">Channels</p>
          <p className="text-xs text-forest/55 mb-3">Saguaros Comms</p>
          {loadingChannels ? (
            <p className="text-sm text-forest/60">Loading channels...</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-forest/60">No channels found.</p>
          ) : (
            <div className="space-y-1.5">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                    selectedChannelId === channel.id
                      ? "bg-forest text-warm-white border-forest"
                      : "bg-cream text-forest border-sand hover:bg-sand/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-semibold">{channel.name}</p>
                    {(unreadByChannel[channel.id] ?? 0) > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold text-forest font-bold">
                        {unreadByChannel[channel.id]}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${selectedChannelId === channel.id ? "text-warm-white/75" : "text-forest/60"}`}>
                    {channel.description ?? channel.channel_type}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="p-4 flex flex-col">
          <div className="mb-3 p-3 border border-sand rounded-md bg-gradient-to-r from-forest to-forest-mid text-warm-white">
            <p className="font-display font-bold text-lg">
              {selectedChannel ? selectedChannel.name : "Messages"}
            </p>
            <p className="text-xs text-warm-white/75 mt-0.5">
              {selectedChannel?.description || "Realtime channel conversation"}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-sand rounded-md bg-cream p-3 space-y-2">
            {!selectedChannelId ? (
              <p className="text-sm text-forest/60">Select a channel to view messages.</p>
            ) : loadingMessages ? (
              <p className="text-sm text-forest/60">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-forest/60">No messages yet. Start the thread.</p>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`border rounded-md p-2.5 ${
                    message.sender_id === currentUserId
                      ? "bg-saguaro/10 border-saguaro/35"
                      : "bg-warm-white border-sand"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-forest text-warm-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {getInitials(message.sender_id)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-forest/75 mb-0.5">
                        <span className="font-semibold text-forest">{getSenderLabel(message.sender_id)}</span>
                        {" "}
                        <span className="text-forest/50">({getSenderSubLabel(message.sender_id)})</span>
                        {" "}
                        <span className="text-forest/45">| {formatTimestamp(message.created_at)}</span>
                      </p>
                      <p className="text-sm text-forest whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Type a message..."
              className="flex-1 resize-none px-3 py-2 border border-sand rounded-md bg-warm-white text-sm text-forest placeholder:text-forest/35"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              className="px-4 py-2 bg-forest text-warm-white font-display font-bold text-sm"
            >
              Send
            </button>
          </div>

          {error && <p className="text-sm text-terracotta mt-2">{error}</p>}
          {setupRequiredMessage && (
            <p className="text-sm text-terracotta mt-2">{setupRequiredMessage}</p>
          )}
        </div>
      </div>
    </section>
  );
}
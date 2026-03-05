import HubShell from "@/components/hub/HubShell";
import ModulePlaceholder from "@/components/hub/ModulePlaceholder";
import MessagesWorkspace from "@/components/hub/MessagesWorkspace";

export default function MessagesPage() {
  return (
    <HubShell
      title="Messages"
      description="Realtime club communication with channels, unread states, mentions, and searchable history."
    >
      <MessagesWorkspace />

      <div className="mt-4">
      <ModulePlaceholder
        what="Native-feeling communication layer to replace fragmented chat tools."
        now={[
          "Channel list + thread UI is now live",
          "Realtime message subscriptions are active",
          "Unread badges and send flow implemented",
          "Permissions foundation supports channel-level access policies",
        ]}
        next={[
          "Persist unread state to channel_members",
          "Add @mention parsing and highlights",
          "Integrate push notifications for PWA",
        ]}
      />
      </div>
    </HubShell>
  );
}

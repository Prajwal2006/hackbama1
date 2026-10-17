import { AppShell } from "@/components/shell/AppShell";
import { getRepo } from "@/data";
import { loadCampusContext } from "@/lib/campus";

export default async function AppLayout({ children, params }: LayoutProps<"/[campus]">) {
  const { campus, viewer } = await loadCampusContext((await params).campus);
  const unread = viewer ? await getRepo().unreadCount(viewer.actor) : 0;
  return (
    <AppShell
      campus={campus}
      unread={unread}
      viewer={
        viewer
          ? { displayName: viewer.profile.displayName, campusId: viewer.actor.campusId, verification: viewer.verification }
          : null
      }
    >
      {children}
    </AppShell>
  );
}

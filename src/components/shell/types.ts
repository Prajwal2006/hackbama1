/** Serializable viewer summary handed to client shell components. */
export type ShellViewer = {
  displayName: string;
  campusId: string;
  verification: "verified" | "simulated";
} | null;

export type ShellCampus = { slug: string; shortName: string; name: string; fictional: boolean };

import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@vicinae/api";
import { execFile } from "node:child_process";
import { BackupStatus, RepoStats, readStatus, repoStats } from "./lib/deja-dup";
import { formatBytes } from "./lib/format";
import { launchDejaDup } from "./browse-backup";

export default function BackupStatusCommand() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Repo stats need network for cloud backends — load lazily, ignore failure.
    repoStats()
      .then(setStats)
      .catch(() => undefined);
  }, []);

  const md = error
    ? `# Backup Status\n\n${error}`
    : status
      ? renderStatus(status, stats)
      : "# Backup Status\n\nLoading…";

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Back Up Now" icon={Icon.Upload} onAction={backupNow} />
          <Action title="Open Déjà Dup" icon={Icon.Cog} onAction={launchDejaDup} />
        </ActionPanel>
      }
    />
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function renderStatus(s: BackupStatus, stats: RepoStats | null): string {
  const lines = [
    "# Déjà Dup Backup Status",
    "",
    `**Last backup:** ${fmtDate(s.lastBackup)}`,
    `**Last run:** ${fmtDate(s.lastRun)}`,
    `**Destination:** ${s.backend} (\`${s.folder}\`)`,
    `**Engine:** ${s.tool}`,
    `**Schedule:** ${s.periodic ? `every ${s.periodicPeriod} day(s)` : "manual"}`,
  ];
  if (stats && (stats.total_size || stats.snapshots_count)) {
    lines.push(
      `**Repository size:** ${formatBytes(stats.total_size)}` +
        (stats.snapshots_count != null ? ` · ${stats.snapshots_count} snapshots` : ""),
    );
  }
  lines.push("", "### Included", ...s.includeList.map((p) => `- \`${p}\``));
  if (s.excludeList.length) {
    lines.push("", "### Excluded", ...s.excludeList.map((p) => `- \`${p}\``));
  }
  return lines.join("\n");
}

async function backupNow() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Starting backup…" });
  execFile("deja-dup", ["--backup"], (err) => {
    if (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start backup";
      toast.message = err.message;
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Backup started in Déjà Dup";
    }
  });
}

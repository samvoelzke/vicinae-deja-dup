import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
  open,
  environment,
} from "@vicinae/api";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import {
  DejaConfig,
  ResticNode,
  Snapshot,
  dumpFile,
  listDir,
  listSnapshots,
  readConfig,
  restorePath,
} from "./lib/deja-dup";
import { useCached } from "./lib/cache";
import { formatBytes, fullDate, recencyBucket, relativeTime, shortDateTime } from "./lib/format";

const BUCKET_ORDER = ["Today", "This Week", "This Month", "This Year", "Older"];

export default function BrowseBackup() {
  const cfg = useCached<DejaConfig>("config", readConfig);
  const snaps = useCached<Snapshot[]>("snapshots", listSnapshots);

  const error = cfg.error || snaps.error;
  if (error && !snaps.data) return <ErrorView message={error} />;

  const config = cfg.data;
  const snapshots = snaps.data ?? [];

  const grouped = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const bucket = recencyBucket(s.time);
    (grouped.get(bucket) ?? grouped.set(bucket, []).get(bucket)!).push(s);
  }

  return (
    <List
      isLoading={snaps.isLoading}
      searchBarPlaceholder="Filter snapshots…"
      isShowingDetail
    >
      <List.EmptyView
        title={snaps.isFirstLoad ? "Loading snapshots…" : "No snapshots found"}
        description={
          snaps.isFirstLoad
            ? "Reading your backup — the first load can take a few seconds."
            : "This backup has no snapshots yet."
        }
        icon={Icon.Cloud}
      />
      {BUCKET_ORDER.filter((b) => grouped.has(b)).map((bucket) => (
        <List.Section key={bucket} title={bucket} subtitle={`${grouped.get(bucket)!.length}`}>
          {grouped.get(bucket)!.map((s) => (
            <SnapshotItem key={s.id} snapshot={s} config={config} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SnapshotItem({ snapshot: s, config }: { snapshot: Snapshot; config: DejaConfig | null }) {
  return (
    <List.Item
      title={shortDateTime(s.time)}
      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
      detail={<SnapshotDetail snapshot={s} />}
      actions={
        config ? (
          <ActionPanel>
            <Action.Push
              title="Browse Files"
              icon={Icon.Folder}
              target={
                <FileBrowser
                  config={config}
                  snapshot={s}
                  path={s.paths.length === 1 ? s.paths[0] : "/"}
                />
              }
            />
            <Action.CopyToClipboard title="Copy Snapshot ID" content={s.id} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function SnapshotDetail({ snapshot: s }: { snapshot: Snapshot }) {
  const M = List.Item.Detail.Metadata;
  return (
    <List.Item.Detail
      metadata={
        <M>
          <M.Label title="Snapshot" text={s.short_id} icon={{ source: Icon.Clock, tintColor: Color.Blue }} />
          <M.Label title="Taken" text={fullDate(s.time)} icon={Icon.Calendar} />
          <M.Label title="Host" text={s.hostname} icon={Icon.HardDrive} />
          <M.Label title="User" text={s.username} icon={Icon.Person} />
          <M.Separator />
          {s.summary?.total_files_processed != null && (
            <M.Label title="Files" text={s.summary.total_files_processed.toLocaleString()} icon={Icon.BlankDocument} />
          )}
          {s.summary?.total_bytes_processed != null && (
            <M.Label title="Size" text={formatBytes(s.summary.total_bytes_processed)} icon={Icon.Cloud} />
          )}
          <M.Separator />
          <M.TagList title="Paths">
            {s.paths.map((p) => (
              <M.TagList.Item key={p} text={p} color={Color.Green} />
            ))}
          </M.TagList>
          {s.tags && s.tags.length > 0 && (
            <M.TagList title="Tags">
              {s.tags.map((t) => (
                <M.TagList.Item key={t} text={t} color={Color.Purple} />
              ))}
            </M.TagList>
          )}
        </M>
      }
    />
  );
}

function FileBrowser({
  config,
  snapshot,
  path,
}: {
  config: DejaConfig;
  snapshot: Snapshot;
  path: string;
}) {
  const key = `ls:${snapshot.id}:${path}`;
  const { data, isLoading, isFirstLoad, error } = useCached<ResticNode[]>(key, () =>
    listDir(snapshot.id, path, config),
  );
  const nodes = data ?? [];

  if (error && !data) return <ErrorView message={error} />;

  const dirs = nodes.filter((n) => n.type === "dir");
  const files = nodes.filter((n) => n.type !== "dir");
  const title = path === "/" ? "/" : path;

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Filter files…">
      <List.EmptyView
        title={isFirstLoad ? "Loading…" : "Empty directory"}
        icon={Icon.Folder}
      />
      <List.Section title="Folders" subtitle={dirs.length ? `${dirs.length}` : undefined}>
        {dirs.map((n) => (
          <FileItem key={n.path} node={n} config={config} snapshot={snapshot} />
        ))}
      </List.Section>
      <List.Section title="Files" subtitle={files.length ? `${files.length}` : undefined}>
        {files.map((n) => (
          <FileItem key={n.path} node={n} config={config} snapshot={snapshot} />
        ))}
      </List.Section>
    </List>
  );
}

function FileItem({
  node,
  config,
  snapshot,
}: {
  node: ResticNode;
  config: DejaConfig;
  snapshot: Snapshot;
}) {
  const isDir = node.type === "dir";
  return (
    <List.Item
      title={node.name}
      icon={
        isDir
          ? { source: Icon.Folder, tintColor: Color.Blue }
          : { source: Icon.BlankDocument, tintColor: Color.SecondaryText }
      }
      accessories={
        isDir
          ? []
          : [
              ...(node.mtime ? [{ text: relativeTime(node.mtime) }] : []),
              { tag: formatBytes(node.size) },
            ]
      }
      actions={<FileActions config={config} snapshot={snapshot} node={node} />}
    />
  );
}

function FileActions({
  config,
  snapshot,
  node,
}: {
  config: DejaConfig;
  snapshot: Snapshot;
  node: ResticNode;
}) {
  if (node.type === "dir") {
    return (
      <ActionPanel>
        <Action.Push
          title="Open Folder"
          icon={Icon.Folder}
          target={<FileBrowser config={config} snapshot={snapshot} path={node.path} />}
        />
        <RestoreActions config={config} snapshot={snapshot} node={node} />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <Action title="Preview File" icon={Icon.Eye} onAction={() => previewFile(config, snapshot, node)} />
      <RestoreActions config={config} snapshot={snapshot} node={node} />
      <Action.CopyToClipboard title="Copy Path" content={node.path} />
    </ActionPanel>
  );
}

function RestoreActions({
  config,
  snapshot,
  node,
}: {
  config: DejaConfig;
  snapshot: Snapshot;
  node: ResticNode;
}) {
  return (
    <>
      <Action
        title="Restore to Original Location"
        icon={Icon.ArrowClockwise}
        onAction={() => runRestore(config, snapshot, node.path, "/")}
      />
      <Action.Push
        title="Restore to…"
        icon={Icon.Download}
        target={<RestoreForm config={config} snapshot={snapshot} node={node} />}
      />
    </>
  );
}

function RestoreForm({
  config,
  snapshot,
  node,
}: {
  config: DejaConfig;
  snapshot: Snapshot;
  node: ResticNode;
}) {
  const { pop } = useNavigation();
  const [target, setTarget] = useState(join(process.env.HOME || "/tmp", "Restored"));
  return (
    <Form
      navigationTitle={`Restore ${node.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Restore Here"
            icon={Icon.Download}
            onSubmit={async (values: Form.Values) => {
              const dest = (values.target as string) || target;
              await runRestore(config, snapshot, node.path, dest);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Target Directory"
        value={target}
        onChange={setTarget}
        info="The file's original path is recreated inside this directory."
      />
      <Form.Description text={`Restoring: ${node.path}`} />
    </Form>
  );
}

async function previewFile(config: DejaConfig, snapshot: Snapshot, node: ResticNode) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Fetching ${node.name}…` });
  try {
    const dest = join(environment.supportPath || tmpdir(), `preview-${basename(node.path)}`);
    await dumpFile(snapshot.id, node.path, dest, config);
    toast.style = Toast.Style.Success;
    toast.title = "Opening preview";
    await open(dest);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Preview failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function runRestore(config: DejaConfig, snapshot: Snapshot, path: string, targetDir: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Restoring ${basename(path)}…` });
  try {
    await restorePath(snapshot.id, path, targetDir, config);
    toast.style = Toast.Style.Success;
    toast.title = "Restored";
    toast.message = `${basename(path)} → ${targetDir}`;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Restore failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

export function launchDejaDup() {
  execFile("deja-dup", (err) => {
    if (err) showToast({ style: Toast.Style.Failure, title: "Could not launch Déjà Dup" });
  });
}

export function ErrorView({ message }: { message: string }) {
  return (
    <Detail
      markdown={`# Cannot read backup\n\n${message}`}
      actions={
        <ActionPanel>
          <Action title="Open Déjà Dup" icon={Icon.Cog} onAction={launchDejaDup} />
        </ActionPanel>
      }
    />
  );
}

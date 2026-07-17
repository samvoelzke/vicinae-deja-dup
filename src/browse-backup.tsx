import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
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
  UnsupportedError,
  dumpFile,
  formatBytes,
  listDir,
  listSnapshots,
  readConfig,
  restorePath,
} from "./lib/deja-dup";

export default function BrowseBackup() {
  const [config, setConfig] = useState<DejaConfig | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await readConfig();
        setConfig(cfg);
        const snaps = await listSnapshots(cfg);
        setSnapshots(snaps);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) return <ErrorView message={error} />;

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter snapshots…" isShowingDetail>
      <List.EmptyView
        title={loading ? "Loading snapshots…" : "No snapshots found"}
        description={loading ? undefined : "This backup has no snapshots yet."}
        icon={Icon.Box}
      />
      {config &&
        snapshots.map((s) => (
          <List.Item
            key={s.id}
            title={new Date(s.time).toLocaleString()}
            subtitle={s.short_id}
            icon={Icon.Box}
            accessories={[{ text: s.hostname }, ...(s.tags?.length ? [{ tag: s.tags[0] }] : [])]}
            detail={<SnapshotDetail snapshot={s} />}
            actions={
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
            }
          />
        ))}
    </List>
  );
}

function SnapshotDetail({ snapshot: s }: { snapshot: Snapshot }) {
  const md = [
    `### Snapshot \`${s.short_id}\``,
    "",
    `**Time:** ${new Date(s.time).toLocaleString()}`,
    `**Host:** ${s.hostname}`,
    `**User:** ${s.username}`,
    s.summary?.total_files_processed != null
      ? `**Files:** ${s.summary.total_files_processed.toLocaleString()}`
      : "",
    s.summary?.total_bytes_processed != null
      ? `**Size:** ${formatBytes(s.summary.total_bytes_processed)}`
      : "",
    "",
    "**Paths:**",
    ...s.paths.map((p) => `- \`${p}\``),
  ]
    .filter(Boolean)
    .join("\n");
  return <List.Item.Detail markdown={md} />;
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
  const [nodes, setNodes] = useState<ResticNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setNodes(await listDir(snapshot.id, path, config));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [path]);

  if (error) return <ErrorView message={error} />;

  const title = path === "/" ? "/" : path;
  return (
    <List
      isLoading={loading}
      navigationTitle={`${snapshot.short_id}: ${title}`}
      searchBarPlaceholder="Filter files…"
    >
      <List.EmptyView title={loading ? "Loading…" : "Empty directory"} icon={Icon.Folder} />
      {nodes.map((n) => (
        <List.Item
          key={n.path}
          title={n.name}
          icon={n.type === "dir" ? Icon.Folder : Icon.Document}
          accessories={
            n.type === "dir"
              ? [{ text: "dir" }]
              : [{ text: formatBytes(n.size) }, ...(n.mtime ? [{ date: new Date(n.mtime) }] : [])]
          }
          actions={
            <FileActions config={config} snapshot={snapshot} node={n} />
          }
        />
      ))}
    </List>
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
      <Action
        title="Preview File"
        icon={Icon.Eye}
        onAction={() => previewFile(config, snapshot, node)}
      />
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
            onSubmit={async (values: { target: string }) => {
              await runRestore(config, snapshot, node.path, values.target || target);
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

async function runRestore(
  config: DejaConfig,
  snapshot: Snapshot,
  path: string,
  targetDir: string,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Restoring ${basename(path)}…`,
  });
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
          <Action title="Open Déjà Dup" icon={Icon.Gear} onAction={launchDejaDup} />
        </ActionPanel>
      }
    />
  );
}

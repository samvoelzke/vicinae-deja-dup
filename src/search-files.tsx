import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@vicinae/api";
import { DejaConfig, FindResult, findFiles, readConfig } from "./lib/deja-dup";
import { formatBytes } from "./lib/format";
import { ErrorView } from "./browse-backup";

export default function SearchFiles() {
  const [config, setConfig] = useState<DejaConfig | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FindResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readConfig()
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!config || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const pattern = query.includes("*") ? query : `*${query}*`;
        const res = await findFiles(pattern, config);
        if (!cancelled) setResults(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, config]);

  if (error) return <ErrorView message={error} />;

  const flat = results.flatMap((r) =>
    (r.matches || []).map((m) => ({ snapshot: r.snapshot, match: m })),
  );

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search files across snapshots (min. 2 chars, * allowed)…"
    >
      <List.EmptyView
        title={query.trim().length < 2 ? "Type to search" : "No matches"}
        description={
          query.trim().length < 2
            ? "Searches file names and paths across all snapshots."
            : `Nothing matching "${query}".`
        }
        icon={Icon.MagnifyingGlass}
      />
      {flat.map(({ snapshot, match }, i) => (
        <List.Item
          key={`${snapshot}-${match.path}-${i}`}
          title={match.name || match.path.split("/").pop() || match.path}
          subtitle={match.path}
          icon={
            match.type === "dir"
              ? { source: Icon.Folder, tintColor: Color.Blue }
              : { source: Icon.BlankDocument, tintColor: Color.SecondaryText }
          }
          accessories={[
            ...(match.size != null ? [{ text: formatBytes(match.size) }] : []),
            { tag: snapshot.slice(0, 8) },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Path" content={match.path} />
              <Action.CopyToClipboard title="Copy Snapshot ID" content={snapshot} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

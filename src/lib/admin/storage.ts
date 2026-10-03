import "server-only";

import { mkdir, readFile as readLocal, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireEnv } from "./session";

/**
 * Where content is read from and saved to.
 *
 * - Development (`npm run dev`): files on this computer, so you see changes instantly. Commit
 *   them with git yourself.
 * - Production (Netlify): the GitHub API. The deployed site can't write files, and every save
 *   should become a commit on `master`, which makes Netlify rebuild the site.
 */
export const repo = "ekamid/nerdybean.com";
export const branch = "master";
export const storageMode: "local" | "github" = process.env.NODE_ENV === "production" ? "github" : "local";

/** A file to write (`content`) or delete (no `content`). Paths are relative to the repo root. */
export type FileChange = { path: string; content?: Buffer };

export const listFiles = (dir: string) => (storageMode === "github" ? github.list(dir) : local.list(dir));
export const readFile = (file: string) => (storageMode === "github" ? github.read(file) : local.read(file));
export const commit = (changes: FileChange[], message: string) =>
  storageMode === "github" ? github.commit(changes, message) : local.commit(changes);

// Local mode only runs in development; the hint stops the production build bundling the whole repo.
const fromRoot = (file: string) => path.join(/* turbopackIgnore: true */ process.cwd(), file);

const local = {
  async list(dir: string) {
    try {
      return await readdir(fromRoot(dir));
    } catch {
      return [];
    }
  },
  async read(file: string) {
    try {
      return await readLocal(fromRoot(file), "utf8");
    } catch {
      return null;
    }
  },
  async commit(changes: FileChange[]) {
    for (const change of changes) {
      const target = fromRoot(change.path);
      if (!change.content) {
        await rm(target, { force: true });
        continue;
      }
      await mkdir(path.dirname(target), { recursive: true });
      // Write then rename, so a page being rendered never reads a half-written file.
      await writeFile(`${target}.tmp`, change.content);
      await rename(`${target}.tmp`, target);
    }
  },
};

/**
 * Calls the GitHub REST API with GITHUB_CONTENT_TOKEN: a fine-grained personal access token that
 * can only read and write the contents of this one repo. Returns null for a 404.
 */
async function gh<T>(endpoint: string, body?: { method: string; json: unknown }): Promise<T | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method: body?.method ?? "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${requireEnv("GITHUB_CONTENT_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    ...(body && { body: JSON.stringify(body.json) }),
  });
  if (res.status === 404 && !body) return null;
  if (!res.ok) throw new Error(`GitHub said ${res.status} to ${body?.method ?? "GET"} ${endpoint}: ${await res.text()}`);
  return (await res.json()) as T;
}
const post = <T>(endpoint: string, json: unknown, method = "POST") => gh<T>(endpoint, { method, json }) as Promise<T>;
async function get<T>(endpoint: string) {
  const found = await gh<T>(endpoint);
  if (!found) throw new Error(`GitHub couldn't find ${endpoint} in ${repo}.`);
  return found;
}

const github = {
  async list(dir: string) {
    const items = await gh<{ name: string; type: string }[]>(`/contents/${dir}?ref=${branch}`);
    return (items ?? []).filter((item) => item.type === "file").map((item) => item.name);
  },
  async read(file: string) {
    const item = await gh<{ content: string }>(`/contents/${file}?ref=${branch}`);
    return item ? Buffer.from(item.content, "base64").toString("utf8") : null;
  },
  /**
   * Saves every change in one commit (an entry and its images together), using the Git data API:
   * upload each file as a blob → build a new tree on top of the current one → make a commit with
   * that tree → move `master` to the new commit. The last step fails if `master` moved in the
   * meantime, rather than overwriting someone else's commit.
   */
  async commit(changes: FileChange[], message: string) {
    const head = await get<{ object: { sha: string } }>(`/git/ref/heads/${branch}`);
    const parent = await get<{ tree: { sha: string } }>(`/git/commits/${head.object.sha}`);
    const tree = await Promise.all(
      changes.map(async (change) => ({
        path: change.path,
        mode: "100644",
        type: "blob",
        sha: change.content
          ? (await post<{ sha: string }>("/git/blobs", { content: change.content.toString("base64"), encoding: "base64" })).sha
          : null, // null removes the file
      })),
    );
    const newTree = await post<{ sha: string }>("/git/trees", { base_tree: parent.tree.sha, tree });
    const created = await post<{ sha: string }>("/git/commits", { message, tree: newTree.sha, parents: [head.object.sha] });
    await post(`/git/refs/heads/${branch}`, { sha: created.sha }, "PATCH");
  },
};

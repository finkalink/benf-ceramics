/*
  Tiny GitHub client for the studio admin.
  Reads data/products.json and publishes every change (data + photos)
  as ONE commit, so the site rebuilds once per publish.

  Works in the browser (window.GitHubStore) and in Node 18+ (for testing).
*/
(function (root) {
  "use strict";

  const API = "https://api.github.com";
  const DATA_PATH = "data/products.json";

  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  class GitHubError extends Error {
    constructor(message, status, kind) {
      super(message);
      this.status = status;
      this.kind = kind; // "auth" | "notfound" | "conflict" | "network" | "other"
    }
  }

  class GitHubStore {
    /** path: the JSON file this store reads and writes (site data by default). */
    constructor({ owner, repo, branch = "main", token, path = DATA_PATH }) {
      Object.assign(this, { owner, repo, branch, token, path });
      this.base = `${API}/repos/${owner}/${repo}`;
    }

    /** Repo info, or null if it doesn't exist / the token can't see it. */
    async repoInfo() {
      try { return await this.req(""); } catch (e) { if (e.kind === "notfound") return null; throw e; }
    }

    async req(path, { method = "GET", body } = {}) {
      let res;
      try {
        res = await fetch(path.startsWith("http") ? path : this.base + path, {
          method,
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${this.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
        });
      } catch (e) {
        throw new GitHubError("Couldn't reach GitHub. Check your internet connection.", 0, "network");
      }
      if (res.status === 204) return null;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const kind = res.status === 401 || res.status === 403 ? "auth"
          : res.status === 404 ? "notfound"
          : res.status === 409 || res.status === 422 ? "conflict" : "other";
        const msg = kind === "auth"
          ? "GitHub didn't accept the access token. It may have expired or be missing write access."
          : kind === "notfound"
            ? "GitHub couldn't find the repository with this token. Check the token's repository access."
            : json.message || `GitHub error ${res.status}`;
        throw new GitHubError(msg, res.status, kind);
      }
      return json;
    }

    /** Current JSON file and its blob sha. With allowMissing, a missing file gives { data: null, sha: null }. */
    async load(ref = this.branch, { allowMissing = false } = {}) {
      try {
        const file = await this.req(`/contents/${this.path}?ref=${encodeURIComponent(ref)}`);
        return { data: JSON.parse(b64ToUtf8(file.content)), sha: file.sha };
      } catch (e) {
        if (allowMissing && e.kind === "notfound") return { data: null, sha: null };
        throw e;
      }
    }

    /**
     * Publish in one commit.
     *  data        object written to data/products.json
     *  addFiles    [{ path, base64 }]  new photos
     *  deletePaths [path]              photos to remove
     *  expectedSha products.json sha we started from (conflict check)
     */
    async publish({ data, addFiles = [], deletePaths = [], message, expectedSha }) {
      const ref = await this.req(`/git/ref/heads/${this.branch}`);
      const headSha = ref.object.sha;
      const head = await this.req(`/git/commits/${headSha}`);

      // expectedSha: sha we started from; null means "the file shouldn't exist yet"; undefined skips the check
      if (expectedSha !== undefined) {
        const current = await this.load(headSha, { allowMissing: true });
        if (current.sha !== expectedSha) {
          throw new GitHubError("The site was changed somewhere else since you opened this page.", 409, "conflict");
        }
      }

      // Only delete files that actually exist
      let deletes = [];
      if (deletePaths.length) {
        const tree = await this.req(`/git/trees/${head.tree.sha}?recursive=1`);
        const existing = new Set(tree.tree.map((t) => t.path));
        deletes = deletePaths.filter((p) => existing.has(p));
      }

      const entries = [];
      for (const f of addFiles) {
        const blob = await this.req("/git/blobs", { method: "POST", body: { content: f.base64, encoding: "base64" } });
        entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
      }
      entries.push({ path: this.path, mode: "100644", type: "blob", content: JSON.stringify(data, null, 2) + "\n" });
      deletes.forEach((p) => entries.push({ path: p, mode: "100644", type: "blob", sha: null }));

      const tree = await this.req("/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree: entries } });
      const commit = await this.req("/git/commits", {
        method: "POST",
        body: { message: message || "Update works from studio admin", tree: tree.sha, parents: [headSha] },
      });
      await this.req(`/git/refs/heads/${this.branch}`, { method: "PATCH", body: { sha: commit.sha } });

      const fresh = await this.load(commit.sha);
      return { commitSha: commit.sha, dataSha: fresh.sha };
    }

    /** Latest GitHub Pages build, or null if the token can't see it. */
    async pagesBuild() {
      try {
        const b = await this.req("/pages/builds/latest");
        return { status: b.status, commit: b.commit };
      } catch {
        return null;
      }
    }

    rawUrl(path) {
      return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`;
    }
  }

  /** Practice mode: reads the live data file, never writes anything. */
  class DemoStore {
    constructor({ records = false } = {}) { this.demo = true; this.records = records; }
    async repoInfo() { return { private: true, demo: true }; }
    async load() {
      if (this.records) {
        // Sample private records so practice mode shows how the archive works
        return { data: { "006": { owner: "Sample: Mom", contact: "", date: "2026-11-20", paid: 20, method: "Venmo", delivery: "Pickup", notes: "Practice-mode example" } }, sha: "demo" };
      }
      const res = await fetch("data/products.json", { cache: "no-store" });
      return { data: await res.json(), sha: "demo" };
    }
    async publish() {
      await new Promise((r) => setTimeout(r, 900));
      return { commitSha: "demo", dataSha: "demo" };
    }
    async pagesBuild() { return null; }
    rawUrl(path) { return path; }
  }

  root.GitHubStore = GitHubStore;
  root.DemoStore = DemoStore;
  root.GitHubError = GitHubError;
})(typeof window !== "undefined" ? window : globalThis);

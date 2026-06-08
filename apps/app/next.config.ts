import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root to the monorepo root so Next/Turbopack doesn't get
  // confused by stray lockfiles higher up the filesystem.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // NOTE: the app no longer imports @qvac/sdk. Inference runs on an external
  // `qvac serve openai` (local device or Railway), reached over HTTP. This is
  // what lets the app deploy to Vercel — the native bare runtime can't run in
  // serverless functions.
};

export default nextConfig;

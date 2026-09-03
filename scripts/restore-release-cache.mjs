import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";
import { prepareMultilingualRelease } from "./prepare-multilingual.mjs";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const stagingRoot = path.join(root, ".catalog-build", "release-cache");
const manifestPath = path.join(root, "catalog-data", "release-cache-manifest.json");
const bundledCacheRoot = path.join(root, "release-cache-upload");
const localCacheRoot = process.env.RELEASE_CACHE_DIR
  ? path.resolve(process.env.RELEASE_CACHE_DIR)
  : fs.existsSync(bundledCacheRoot)
    ? bundledCacheRoot
    : "";
const artifactToken = process.env.VERCEL_ARTIFACTS_TOKEN || process.env.TURBO_TOKEN || "";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedTasks = ["cache-core", ..."0123456789abcdef".split("").map((prefix) => `cache-media-${prefix}`)];

const assertManagedPath = (target, parent, name) => {
  if (path.dirname(target) !== parent || path.basename(target) !== name) {
    throw new Error(`Refusing to replace unmanaged path: ${target}`);
  }
};

if (manifest.version !== 1 || !/^team_[A-Za-z0-9]+$/.test(manifest.teamId || "") || !Array.isArray(manifest.artifacts)) {
  throw new Error("Release cache manifest is invalid.");
}
if (manifest.artifacts.length !== expectedTasks.length ||
    JSON.stringify(manifest.artifacts.map((item) => item.task)) !== JSON.stringify(expectedTasks)) {
  throw new Error("Release cache manifest must contain the governed core and 16 ordered media shards.");
}
const seenHashes = new Set();
for (const artifact of manifest.artifacts) {
  if (!/^[0-9a-f]{16}$/.test(artifact.hash) || !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      !Number.isInteger(artifact.bytes) || artifact.bytes < 1_000_000 || seenHashes.has(artifact.hash)) {
    throw new Error(`Invalid release artifact metadata for ${artifact.task}.`);
  }
  seenHashes.add(artifact.hash);
}
if (!localCacheRoot && !artifactToken) throw new Error("Vercel artifact credentials are unavailable.");
if (typeof zlib.zstdDecompressSync !== "function") throw new Error("Node.js Zstandard support is required.");

assertManagedPath(publicRoot, root, "public");
assertManagedPath(stagingRoot, path.join(root, ".catalog-build"), "release-cache");
fs.rmSync(publicRoot, { recursive: true, force: true });
fs.rmSync(stagingRoot, { recursive: true, force: true });
fs.mkdirSync(stagingRoot, { recursive: true });

const validateArtifact = (artifact, data) => {
  const digest = crypto.createHash("sha256").update(data).digest("hex");
  if (data.length !== artifact.bytes || digest !== artifact.sha256) {
    throw new Error(`${artifact.task} failed integrity validation (${data.length} bytes, ${digest}).`);
  }
};

const downloadArtifact = async (artifact) => {
  let data;
  if (localCacheRoot) {
    const source = path.join(localCacheRoot, `${artifact.hash}.tar.zst`);
    data = fs.readFileSync(source);
  } else {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(
          `https://api.vercel.com/v8/artifacts/${artifact.hash}?teamId=${manifest.teamId}`,
          {
            headers: { Authorization: `Bearer ${artifactToken}` },
            signal: AbortSignal.timeout(600_000),
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = Buffer.from(await response.arrayBuffer());
        break;
      } catch (error) {
        lastError = error;
        console.warn(`Retrying ${artifact.task} artifact download (${attempt}/3): ${error.message}`);
      }
    }
    if (!data) throw lastError;
  }
  validateArtifact(artifact, data);
  fs.writeFileSync(path.join(stagingRoot, `${artifact.hash}.tar.zst`), data);
  console.log(`Release artifact ready: ${artifact.task} (${Math.round(data.length / 1024 / 1024)} MiB)`);
};

let cursor = 0;
const worker = async () => {
  while (cursor < manifest.artifacts.length) {
    const artifact = manifest.artifacts[cursor++];
    await downloadArtifact(artifact);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));

for (const artifact of manifest.artifacts) {
  const compressedPath = path.join(stagingRoot, `${artifact.hash}.tar.zst`);
  const tarPath = path.join(stagingRoot, `${artifact.hash}.tar`);
  fs.writeFileSync(tarPath, zlib.zstdDecompressSync(fs.readFileSync(compressedPath)));
  const listing = spawnSync("tar", ["-tf", tarPath], { cwd: root, encoding: "utf8" });
  if (listing.status !== 0) throw new Error(`Could not inspect ${artifact.task}: ${listing.stderr.trim()}`);
  const unsafeEntry = listing.stdout.split(/\r?\n/).filter(Boolean).find((entry) => {
    const normalized = path.posix.normalize(entry.replace(/^\.\//, ""));
    return normalized.startsWith("../") || normalized.startsWith("/") ||
      !(normalized === "public" || normalized.startsWith("public/") || normalized === ".turbo" || normalized.startsWith(".turbo/"));
  });
  if (unsafeEntry) throw new Error(`${artifact.task} contains an unsafe archive entry: ${unsafeEntry}`);
  const extraction = spawnSync("tar", ["-xf", tarPath, "-C", root], { cwd: root, encoding: "utf8" });
  if (extraction.status !== 0) throw new Error(`Could not extract ${artifact.task}: ${extraction.stderr.trim()}`);
  fs.rmSync(tarPath, { force: true });
  fs.rmSync(compressedPath, { force: true });
}

for (const internal of [".turbo", ".wrangler"]) {
  fs.rmSync(path.join(publicRoot, internal), { recursive: true, force: true });
}
fs.rmSync(stagingRoot, { recursive: true, force: true });

prepareMultilingualRelease();

const verification = spawnSync(process.execPath, [path.join(root, "scripts", "verify-release-output.mjs")], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
if (verification.status !== 0) process.exit(verification.status || 1);
console.log(`Immutable release restored from ${manifest.artifacts.length} verified cache artifacts.`);

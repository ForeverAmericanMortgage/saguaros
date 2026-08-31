import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

// Run from the Black Plate app root. Fail before publication if the deployment
// payload is missing this app, or Next.js produces an error-only build.
const root = process.cwd();
const stage = process.argv[2];

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(
    statSync(absolutePath, { throwIfNoEntry: false })?.isFile(),
    `Black Plate deployment blocked: missing ${relativePath}`,
  );
  return absolutePath;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(requireFile(relativePath), "utf8"));
}

try {
  if (stage === "source") {
    for (const file of [
      "app/page.tsx",
      "app/layout.tsx",
      "app/api/meta/conversion/route.ts",
      "app/api/cron/mailchimp-sync/route.ts",
      "components/TrackedOutboundLink.tsx",
      "public/images/4azkids-white-cutout.png",
    ]) {
      requireFile(file);
    }
  } else if (stage === "build") {
    const routes = readJson(".next/server/app-paths-manifest.json");
    for (const route of [
      "/page",
      "/api/meta/conversion/route",
      "/api/cron/mailchimp-sync/route",
    ]) {
      assert.equal(
        typeof routes[route],
        "string",
        `Black Plate deployment blocked: build is missing ${route}`,
      );
      requireFile(path.join(".next/server", routes[route]));
    }

    const prerender = readJson(".next/prerender-manifest.json");
    assert.ok(
      prerender.routes?.["/"],
      "Black Plate deployment blocked: homepage was not prerendered",
    );
    const homepage = readFileSync(
      requireFile(".next/server/app/index.html"),
      "utf8",
    );
    assert.match(
      homepage,
      /<title>The Blackout Plate \| 4AZ Kids/,
      "Black Plate deployment blocked: homepage branding is missing",
    );
    assert.match(
      homepage,
      /href="https:\/\/azmvdnow\.gov\/plates"/,
      "Black Plate deployment blocked: order link is missing",
    );
  } else {
    throw new Error("Usage: node scripts/verify-deployment.mjs source|build");
  }
  console.log(`Black Plate deployment ${stage} check passed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

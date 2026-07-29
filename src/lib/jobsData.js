import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs-data.json");

// Shape on disk: { "<jobId>": { title, company, locationRaw, url, categories, source, postedAt } }
// (description is intentionally left out here to keep this file small - the board
// links out to the original listing rather than hosting the full description.)

export async function loadJobsData() {
  try {
    const raw = await fs.readFile(JOBS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function saveJobsData(jobsData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobsData, null, 2) + "\n", "utf-8");
}

export function addJobToData(jobsData, categorizedJob) {
  jobsData[categorizedJob.id] = {
    title: categorizedJob.title,
    company: categorizedJob.company,
    locationRaw: categorizedJob.locationRaw,
    url: categorizedJob.url,
    categories: categorizedJob.categories,
    source: categorizedJob.source,
    postedAt: categorizedJob.postedAt,
  };
  return jobsData;
}

// Keeps the public board showing only recent roles and stops the file growing forever.
export function pruneJobsData(jobsData, maxAgeDays = 45) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const pruned = {};
  for (const [id, entry] of Object.entries(jobsData)) {
    const postedAt = entry.postedAt ? new Date(entry.postedAt).getTime() : 0;
    if (postedAt >= cutoff) pruned[id] = entry;
  }
  return pruned;
}

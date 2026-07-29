import { fetchRemotive } from "./sources/remotive.js";
import { fetchRemoteOK } from "./sources/remoteok.js";
import { fetchArbeitnow } from "./sources/arbeitnow.js";
import { fetchWeWorkRemotely } from "./sources/weworkremotely.js";
import { fetchNigeriaBoards } from "./sources/nigeria-rss.js";

import { dedupeJobs } from "./lib/dedupe.js";
import { categorizeJob, DISCIPLINE_TAGS } from "./lib/categorize.js";
import { loadStore, saveStore, pruneStore } from "./lib/store.js";
import { loadJobsData, saveJobsData, addJobToData, pruneJobsData } from "./lib/jobsData.js";

const SOURCES = [
  { name: "remotive", fn: fetchRemotive },
  { name: "remoteok", fn: fetchRemoteOK },
  { name: "arbeitnow", fn: fetchArbeitnow },
  { name: "weworkremotely", fn: fetchWeWorkRemotely },
  { name: "nigeria-boards", fn: fetchNigeriaBoards },
];

async function fetchAllSources() {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fn()));
  const allJobs = [];

  results.forEach((result, i) => {
    const sourceName = SOURCES[i].name;
    if (result.status === "fulfilled") {
      console.log(`[${sourceName}] fetched ${result.value.length} jobs`);
      allJobs.push(...result.value);
    } else {
      console.error(`[${sourceName}] failed:`, result.reason?.message || result.reason);
    }
  });

  return allJobs;
}

async function run() {
  console.log(`Job engine run started at ${new Date().toISOString()}`);

  const store = pruneStore(await loadStore());
  let jobsData = pruneJobsData(await loadJobsData());

  const allJobs = await fetchAllSources();
  console.log(`Total fetched across all sources: ${allJobs.length}`);

  const freshJobs = dedupeJobs(allJobs, store);
  console.log(`New jobs after de-dupe: ${freshJobs.length}`);

  let addedCount = 0;
  for (const job of freshJobs) {
    const categorized = categorizeJob(job);

    // Mark every fresh job as seen either way, so irrelevant ones aren't re-checked hourly forever.
    store[job.id] = {
      postedAt: new Date().toISOString(),
      title: job.title,
      company: job.company,
    };

    // Skip roles that aren't actually tech/QA-relevant (e.g. "Handyman", "Window Cleaner")
    // - these come through from the general job APIs, which cover every industry.
    const isRelevant = categorized.categories.some((c) => DISCIPLINE_TAGS.includes(c));
    if (!isRelevant) continue;

    jobsData = addJobToData(jobsData, categorized);
    addedCount += 1;
    console.log(`+ ${job.title} @ ${job.company} [${categorized.categories.join(", ")}]`);
  }

  await saveStore(store);
  await saveJobsData(jobsData);

  console.log(
    `Done. Added: ${addedCount}, Filtered out (not tech/QA-relevant): ${freshJobs.length - addedCount}, ` +
    `Skipped (duplicates): ${allJobs.length - freshJobs.length}, Total live on board: ${Object.keys(jobsData).length}`
  );
}

run().catch((err) => {
  console.error("Job engine crashed:", err);
  process.exit(1);
});

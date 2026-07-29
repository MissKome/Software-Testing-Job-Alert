import { fetchRemotive } from "./sources/remotive.js";
import { fetchRemoteOK } from "./sources/remoteok.js";
import { fetchArbeitnow } from "./sources/arbeitnow.js";
import { fetchWeWorkRemotely } from "./sources/weworkremotely.js";
import { fetchNigeriaBoards } from "./sources/nigeria-rss.js";

import { dedupeJobs } from "./lib/dedupe.js";
import { categorizeJob } from "./lib/categorize.js";
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

  for (const job of freshJobs) {
    const categorized = categorizeJob(job);
    jobsData = addJobToData(jobsData, categorized);
    store[job.id] = {
      postedAt: new Date().toISOString(),
      title: job.title,
      company: job.company,
    };
    console.log(`+ ${job.title} @ ${job.company} [${categorized.categories.join(", ")}]`);
  }

  await saveStore(store);
  await saveJobsData(jobsData);

  console.log(
    `Done. Added: ${freshJobs.length}, Skipped (duplicates): ${allJobs.length - freshJobs.length}, ` +
    `Total live on board: ${Object.keys(jobsData).length}`
  );
}

run().catch((err) => {
  console.error("Job engine crashed:", err);
  process.exit(1);
});

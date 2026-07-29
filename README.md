# TestmeQA Job Engine + Job Board

An hourly bot that finds QA/tech jobs, cleans them up, sorts them into categories, and publishes them to your own free job board website — no WordPress, no server, no hosting headaches.

## What it does, every hour

1. **Fetches** jobs from 5 sources:
   - Remotive, RemoteOK, Arbeitnow — remote job APIs
   - We Work Remotely — RSS (programming + QA categories)
   - HotNigerianJobs, MyJobMag — RSS (Nigeria-focused)
2. **Removes duplicates** — both within the same run (two sites listing the same job) and against everything it's already found before.
3. **Categorizes** each job by work mode (Remote / Hybrid / Onsite), country (Nigeria, UK, USA, etc.), seniority (Junior, Mid-level, Senior, Internship), and discipline (QA / Testing, Frontend, Backend, DevOps, etc.).
4. **Publishes** the whole board to a free website on GitHub Pages — filterable by all those categories, searchable, sorted newest-first.
5. **Remembers** everything it's already found, so nothing gets duplicated, and older roles quietly drop off the board after 45 days.

## One-time setup

### 1. Push this code to GitHub

- Create a GitHub repo (public or private — public is required for GitHub Pages on a free plan, unless you're on GitHub Pro/Team).
- Push everything in this folder to it, **at the repo root** — not nested inside another folder. (i.e. `src/`, `site/`, `data/`, `.github/`, `package.json` should all show up directly when you open the repo, not inside a `job-engine/` subfolder.)

### 2. Turn on GitHub Pages

- In the repo: **Settings → Pages**.
- Under **Build and deployment → Source**, choose **GitHub Actions** (not "Deploy from a branch").
- That's it — no further settings needed here, the workflow handles the rest.

### 3. Run it

- Go to the **Actions** tab → **Job Engine** (left sidebar) → **Run workflow** button.
- Wait ~1-2 minutes, then check the **Settings → Pages** page again — it'll show you the live URL, something like:
  `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- From here on, it runs automatically every hour on its own.

## Using a custom domain (optional)

If you want it at something like `jobs.testmeqa.com.ng` instead of the default `github.io` address:
1. In your domain's DNS settings, add a `CNAME` record pointing `jobs` (or whichever subdomain) to `YOUR-USERNAME.github.io`.
2. In the repo: **Settings → Pages → Custom domain**, enter `jobs.testmeqa.com.ng`, save.
3. Wait a few minutes for DNS + GitHub to confirm it (GitHub will show a green checkmark once it's live).

## Testing locally before you push

```bash
npm install
npm start        # fetches + categorizes + saves to data/jobs-seen.json and data/jobs-data.json
cp data/jobs-data.json site/jobs.json
```
Then open `site/index.html` directly in a browser (or run a tiny local server, e.g. `npx serve site`) to preview the board with real data before it goes live.

## Tuning it

- **Add/remove job sources**: edit `src/sources/` (each file exports one `fetchX()` function returning normalized jobs) and register it in `SOURCES` in `src/index.js`.
- **Add/remove categories or keywords**: edit `src/lib/categorize.js` — plain keyword lists, easy to extend (more Nigerian cities, more seniority synonyms, more tech disciplines).
- **Change the schedule**: edit the `cron` line in `.github/workflows/job-engine.yml` (currently `0 * * * *` = top of every hour, UTC).
- **How long a role stays listed**: `pruneJobsData()` in `src/lib/jobsData.js` currently keeps 45 days — adjust the number to show more/less history.
- **Look and feel**: everything is in the one file `site/index.html` — colors are CSS variables at the top of the `<style>` block, so palette tweaks are quick.

## How de-duplication survives across hourly runs

Every job gets a stable ID (a hash of title + company + URL). After a job is found once, its ID is saved to `data/jobs-seen.json`, and its full details go into `data/jobs-data.json` (which is what powers the public board). GitHub Actions commits both files back to the repo after every run, so nothing is lost when the workflow's container shuts down between hourly runs.

## Notes on the sources

- The APIs (Remotive, RemoteOK, Arbeitnow) are free and don't need a key.
- The RSS feeds (We Work Remotely, HotNigerianJobs, MyJobMag) are the sites' own public syndication feeds. If a site changes its feed URL or blocks automated requests, that one source just logs an error and skips — it won't break the other sources or crash the run.
- Want more Nigerian-specific sources (e.g. Jobberman)? They don't publish a public API/RSS, so pulling from them would mean scraping their HTML — more fragile and more ToS-sensitive. Happy to add it if you want, just say so.
# Software-Testing-Job-Alert

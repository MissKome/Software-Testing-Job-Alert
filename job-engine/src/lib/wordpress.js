// Pushes jobs to WordPress via the built-in REST API using an Application Password.
// Docs: https://developer.wordpress.org/rest-api/reference/posts/

const WP_URL = process.env.WP_URL; // e.g. https://testmeqa.com (no trailing slash)
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

function assertConfigured() {
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    throw new Error(
      "Missing WordPress config. Set WP_URL, WP_USER, WP_APP_PASSWORD as environment variables / GitHub secrets."
    );
  }
}

function authHeader() {
  const token = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

async function wpFetch(endpoint, options = {}) {
  assertConfigured();
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WordPress API ${endpoint} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Cache category name -> term ID for the lifetime of one run, to avoid duplicate lookups.
const categoryCache = new Map();

async function getOrCreateCategoryId(name) {
  if (categoryCache.has(name)) return categoryCache.get(name);

  const existing = await wpFetch(`categories?search=${encodeURIComponent(name)}&per_page=10`);
  const exact = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (exact) {
    categoryCache.set(name, exact.id);
    return exact.id;
  }

  const created = await wpFetch("categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  categoryCache.set(name, created.id);
  return created.id;
}

function renderJobHtml(job) {
  const meta = [
    `<strong>Company:</strong> ${escapeHtml(job.company)}`,
    `<strong>Location:</strong> ${escapeHtml(job.locationRaw || "Not specified")}`,
    `<strong>Source:</strong> ${escapeHtml(job.source)}`,
  ].join("<br>");

  return `
    <p>${meta}</p>
    <p>${escapeHtml(job.description).slice(0, 1500)}${job.description.length > 1500 ? "…" : ""}</p>
    <p><a href="${job.url}" target="_blank" rel="noopener noreferrer">Apply / view original listing</a></p>
  `.trim();
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Publishes a single normalized+categorized job as a WordPress post.
 * Returns the created post's ID.
 */
export async function publishJobToWordPress(job) {
  const categoryIds = [];
  for (const name of job.categories) {
    try {
      categoryIds.push(await getOrCreateCategoryId(name));
    } catch (err) {
      console.error(`Could not resolve category "${name}":`, err.message);
    }
  }

  const post = await wpFetch("posts", {
    method: "POST",
    body: JSON.stringify({
      title: `${job.title} @ ${job.company}`,
      content: renderJobHtml(job),
      status: "publish",
      categories: categoryIds,
      date: job.postedAt,
    }),
  });

  return post.id;
}

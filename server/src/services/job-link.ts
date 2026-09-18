import { fetchPublicPage } from './safe-fetch.js';

export type ParsedJobPosting = {
  company: string | null;
  role: string | null;
  location: string | null;
  source: string | null;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  appliedAt: string | null;
  confidence: 'high' | 'medium' | 'low';
};

const ATS_SOURCES: [RegExp, string][] = [
  [/greenhouse\.io|grnh\.se/, 'Greenhouse'], [/lever\.co/, 'Lever'], [/ashbyhq\.com/, 'Ashby'],
  [/myworkdayjobs\.com|workday/, 'Workday'], [/smartrecruiters\.com/, 'SmartRecruiters'], [/jobvite\.com/, 'Jobvite'],
  [/icims\.com/, 'iCIMS'], [/taleo\.net/, 'Taleo'], [/successfactors/, 'SuccessFactors'], [/workable\.com/, 'Workable'],
  [/recruitee\.com/, 'Recruitee'], [/breezy\.hr/, 'Breezy'], [/bamboohr\.com/, 'BambooHR'], [/teamtailor\.com/, 'Teamtailor'],
  [/linkedin\.com/, 'LinkedIn'], [/indeed\./, 'Indeed'], [/glassdoor\./, 'Glassdoor'], [/naukri\.com/, 'Naukri'],
  [/wellfound\.com|angel\.co/, 'Wellfound'], [/monster\./, 'Monster'], [/dice\.com/, 'Dice'], [/ziprecruiter\./, 'ZipRecruiter']
];

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (value: string) => value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
  if (/^#x/i.test(code)) return String.fromCodePoint(parseInt(code.slice(2), 16));
  if (/^#/.test(code)) return String.fromCodePoint(Number(code.slice(1)));
  return ENTITIES[code.toLowerCase()] ?? match;
});

const clean = (value: unknown, max = 500): string | null => {
  if (typeof value !== 'string') return null;
  const text = decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
};

const toText = (value: unknown, max = 5_000): string | null => {
  if (typeof value !== 'string') return null;
  const withBreaks = value.replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  const text = decode(withBreaks).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text ? text.slice(0, max) : null;
};

const toAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : NaN;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
};

/** Yearly figures only; hourly and monthly postings are skipped rather than stored as a wrong yearly range. */
function readSalary(value: Record<string, unknown> | undefined) {
  const salary = value?.value as Record<string, unknown> | undefined;
  if (!salary) return { salaryMin: null, salaryMax: null, currency: null };
  const unit = String(salary.unitText ?? '').toUpperCase();
  if (unit && unit !== 'YEAR' && unit !== 'YEARLY') return { salaryMin: null, salaryMax: null, currency: null };
  const currency = typeof value?.currency === 'string' && value.currency.length === 3 ? value.currency.toUpperCase() : null;
  const min = toAmount(salary.minValue ?? salary.value);
  const max = toAmount(salary.maxValue ?? salary.value);
  return { salaryMin: min, salaryMax: max && min && max < min ? null : max, currency };
}

type PostalAddress = { addressLocality?: unknown; addressRegion?: unknown; addressCountry?: unknown; name?: unknown };

function readLocation(value: unknown): string | null {
  const entries = Array.isArray(value) ? value : [value];
  for (const entry of entries) {
    const place = entry as { address?: unknown } | undefined;
    const address = (place?.address ?? place) as PostalAddress | string | undefined;
    if (typeof address === 'string') return clean(address, 160);
    const country = address?.addressCountry as PostalAddress | string | undefined;
    const parts = [address?.addressLocality, address?.addressRegion, typeof country === 'string' ? country : country?.name]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    if (parts.length) return clean(parts.join(', '), 160);
  }
  return null;
}

function* jsonLdBlocks(html: string) {
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      yield JSON.parse(match[1].replace(/<!--|-->/g, '').trim()) as unknown;
    } catch {
      // A malformed block should not stop the others from being read.
    }
  }
}

function findJobPosting(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const record = node as Record<string, unknown>;
  const type = record['@type'];
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return record;
  for (const key of ['@graph', 'mainEntity', 'itemListElement', 'about']) {
    const found = findJobPosting(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

const meta = (html: string, name: string) => {
  const forward = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i');
  return clean(html.match(forward)?.[1] ?? html.match(reversed)?.[1], 2_000);
};

const ROLE_WORDS = /engineer|developer|designer|manager|analyst|scientist|intern|lead|architect|consultant|specialist|director|administrator|officer|associate|executive|writer|marketer|recruiter|technician|accountant/i;

/** Career pages title like "Senior Engineer - Acme" or "Acme | Frontend Developer". */
function splitTitle(title: string | null): { role: string | null; company: string | null } {
  if (!title) return { role: null, company: null };
  const parts = title.split(/\s+[|–—·-]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { role: clean(title, 120), company: null };
  const noise = /^(careers?|jobs?|job (opening|posting|application)|apply|hiring)$/i;
  const meaningful = parts.filter((part) => !noise.test(part));
  const [first, second] = meaningful.length >= 2 ? meaningful : parts;
  return ROLE_WORDS.test(first) || !ROLE_WORDS.test(second)
    ? { role: clean(first, 120), company: clean(second, 120) }
    : { role: clean(second, 120), company: clean(first, 120) };
}

const titleCase = (slug: string) => slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();

/** Lever and Greenhouse put the company slug in the path, Workday and BambooHR in the subdomain. */
function companyFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  if (/(^|\.)(lever\.co|greenhouse\.io|ashbyhq\.com|workable\.com|recruitee\.com|teamtailor\.com|breezy\.hr)$/.test(host)) {
    const slug = segments[0] === 'embed' || segments[0] === 'jobs' ? segments[1] : segments[0];
    return slug && !/^\d+$/.test(slug) ? clean(titleCase(slug), 120) : null;
  }
  const subdomain = host.split('.')[0];
  if (/myworkdayjobs\.com|bamboohr\.com|jobvite\.com|smartrecruiters\.com/.test(host) && subdomain && subdomain !== 'www') {
    return clean(titleCase(subdomain), 120);
  }
  const bare = host.split('.').slice(-2)[0] ?? '';
  return /careers?|jobs?|apply|boards|hire|talent|recruit|workday|linkedin|indeed|glassdoor|naukri|google|amazonaws/.test(bare) ? null : clean(titleCase(bare), 120);
}

export function extractJobPosting(html: string, url: URL): ParsedJobPosting {
  const source = ATS_SOURCES.find(([pattern]) => pattern.test(url.hostname))?.[1] ?? null;
  const posting: ParsedJobPosting = {
    company: null, role: null, location: null, source, description: null,
    salaryMin: null, salaryMax: null, currency: null, appliedAt: null, confidence: 'low'
  };

  for (const block of jsonLdBlocks(html)) {
    const job = findJobPosting(block);
    if (!job) continue;
    const organisation = job.hiringOrganization as Record<string, unknown> | string | undefined;
    const salary = readSalary((job.baseSalary ?? job.estimatedSalary) as Record<string, unknown> | undefined);
    const posted = typeof job.datePosted === 'string' ? new Date(job.datePosted) : null;
    posting.company = clean(typeof organisation === 'string' ? organisation : organisation?.name, 120);
    posting.role = clean(job.title, 120);
    posting.location = readLocation(job.jobLocation) ?? (job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : null);
    posting.description = toText(job.description);
    posting.salaryMin = salary.salaryMin;
    posting.salaryMax = salary.salaryMax;
    posting.currency = salary.currency;
    posting.appliedAt = posted && !Number.isNaN(posted.getTime()) ? posted.toISOString().slice(0, 10) : null;
    posting.confidence = 'high';
    break;
  }

  const pageTitle = meta(html, 'og:title') ?? clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], 300);
  const fromTitle = splitTitle(pageTitle);
  const siteName = meta(html, 'og:site_name');
  const isAtsHost = ATS_SOURCES.some(([pattern]) => pattern.test(url.hostname));

  posting.role ??= fromTitle.role;
  posting.company ??= fromTitle.company ?? (isAtsHost ? null : siteName) ?? companyFromUrl(url);
  posting.description ??= toText(meta(html, 'og:description') ?? meta(html, 'description'));
  posting.location ??= clean(meta(html, 'job:location'), 160);
  if (posting.confidence !== 'high') posting.confidence = posting.role && posting.company ? 'medium' : 'low';
  return posting;
}

export async function parseJobLink(rawUrl: string) {
  const { url, html } = await fetchPublicPage(rawUrl);
  return { jobUrl: url.toString().slice(0, 2_048), posting: extractJobPosting(html, url) };
}

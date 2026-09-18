import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv, toRecords } from './csv.js';
import { extractJobPosting } from './job-link.js';
import { isPrivateAddress } from './safe-fetch.js';

const pageWith = (body: string) => `<!doctype html><html><head>${body}</head><body></body></html>`;

describe('job posting extraction', () => {
  it('reads a JSON-LD JobPosting, including a yearly salary range', () => {
    const html = pageWith(`<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Senior Frontend Engineer',
      datePosted: '2026-09-01',
      hiringOrganization: { '@type': 'Organization', name: 'BrightPath Labs' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'Berlin', addressCountry: 'Germany' } },
      baseSalary: { '@type': 'MonetaryAmount', currency: 'EUR', value: { '@type': 'QuantitativeValue', minValue: 70000, maxValue: 90000, unitText: 'YEAR' } },
      description: '<p>Build the <b>web</b> app.</p><li>React</li>'
    })}</script>`);

    const posting = extractJobPosting(html, new URL('https://boards.greenhouse.io/brightpath/jobs/42'));

    expect(posting).toMatchObject({
      company: 'BrightPath Labs', role: 'Senior Frontend Engineer', location: 'Berlin, Germany',
      source: 'Greenhouse', salaryMin: 70_000, salaryMax: 90_000, currency: 'EUR',
      appliedAt: '2026-09-01', confidence: 'high'
    });
    expect(posting.description).toContain('Build the web app.');
  });

  it('ignores an hourly rate rather than storing it as a yearly range', () => {
    const html = pageWith(`<script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting', title: 'Support Agent', hiringOrganization: { name: 'Acme' },
      baseSalary: { currency: 'USD', value: { minValue: 22, maxValue: 28, unitText: 'HOUR' } }
    })}</script>`);

    expect(extractJobPosting(html, new URL('https://acme.com/jobs/1'))).toMatchObject({ salaryMin: null, salaryMax: null, currency: null });
  });

  it('falls back to OpenGraph tags and the URL when there is no structured data', () => {
    const html = pageWith('<meta property="og:title" content="Backend Developer - Northwind" /><meta name="description" content="Own our billing services." />');

    expect(extractJobPosting(html, new URL('https://jobs.lever.co/northwind/abc-123'))).toMatchObject({
      role: 'Backend Developer', company: 'Northwind', source: 'Lever', description: 'Own our billing services.', confidence: 'medium'
    });
  });

  it('keeps reading when one JSON-LD block is malformed', () => {
    const html = pageWith(`<script type="application/ld+json">{ not json }</script><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'JobPosting', title: 'QA Engineer', hiringOrganization: { name: 'Contoso' } }] })}</script>`);

    expect(extractJobPosting(html, new URL('https://contoso.com/careers/qa'))).toMatchObject({ role: 'QA Engineer', company: 'Contoso', confidence: 'high' });
  });
});

describe('private address guard', () => {
  it('rejects loopback, private and link-local addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '192.168.0.5', '172.16.9.9', '169.254.1.1', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const address of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });
});

describe('csv round trip', () => {
  it('quotes cells containing commas, quotes and newlines', () => {
    const csv = toCsv(['company', 'description'], [{ company: 'Acme, Inc.', description: 'Line one\nHe said "hi"' }]);
    expect(parseCsv(csv)).toEqual([['company', 'description'], ['Acme, Inc.', 'Line one\nHe said "hi"']]);
  });

  it('maps headers onto records regardless of case and spacing', () => {
    const records = toRecords(parseCsv('Company, Applied At\r\nAcme,2026-09-01\r\n'));
    expect(records).toEqual([{ company: 'Acme', appliedat: '2026-09-01' }]);
  });
});

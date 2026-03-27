export interface Env {
	DB: D1Database;
	INGESTION_SECRET?: string;
}

type IngestPayload = {
	title: string;
	slug: string;
	author: string;
	content: string;
	excerpt: string;
	tags: string;
	issue_url: string;
};

// Helpers: shared normalization utilities for ingestion and search inputs.
function toSafeString(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (value === null || value === undefined) return '';
	return String(value).trim();
}

function normalizeSlug(value: string): string {
	const normalized = toSafeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return normalized;
}

// Ingestion validation: coerce external payloads into canonical DB-ready strings.
function normalizePayload(raw: any): { payload?: IngestPayload; error?: string } {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { error: 'Payload must be a JSON object.' };
	}

	const title = toSafeString(raw.title);
	const author = toSafeString(raw.author);
	const content = toSafeString(raw.content);
	const providedSlug = normalizeSlug(raw.slug);
	const issueUrl = toSafeString(raw.issue_url);
	const tags = toSafeString(raw.tags);

	if (!title) return { error: 'Missing or invalid "title".' };
	if (!author) return { error: 'Missing or invalid "author".' };
	if (!content) return { error: 'Missing or invalid "content".' };

	const slug = providedSlug || normalizeSlug(title);
	if (!slug) return { error: 'Missing or invalid "slug".' };

	const excerptInput = toSafeString(raw.excerpt);
	const excerptBase = excerptInput || content.slice(0, 200).trim();
	const excerpt = excerptBase || 'No excerpt available.';

	return {
		payload: {
			title,
			slug,
			author,
			content,
			excerpt,
			tags,
			issue_url: issueUrl
		}
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// 1. Search Endpoint: GET /search?q=keyword
		if (url.pathname === '/search' && request.method === 'GET') {
			const query = url.searchParams.get('q');
			if (!query) return new Response('Missing query', { status: 400 });

			try {
				// Sanitize query before passing to FTS5 MATCH.
				// FTS5 interprets "col:term" as a column-scoped search, so raw agent
				// queries containing colons (e.g. "real-time:chat") cause
				// "no such column" errors. Quoting each token prevents this.
				const ftsQuery = query
					.split(/\s+/)
					.map(token => token.replace(/"/g, ''))   // strip any embedded quotes
					.filter(Boolean)
					.map(token => `"${token}"`)              // quote each token → phrase match
					.join(' ');

				if (!ftsQuery) return new Response('Missing query', { status: 400 });

				// We use FTS5 MATCH for ultra-fast, ranked searching
				const { results } = await env.DB.prepare(
					`SELECT
						contributions.id,
						contributions.title,
						contributions.slug,
						contributions.author,
						contributions.content,
						contributions.excerpt,
						contributions.tags,
						contributions.github_issue_url,
						contributions.created_at
					 FROM contributions_fts
					 JOIN contributions ON contributions.id = contributions_fts.rowid
					 WHERE contributions_fts MATCH ?
					 ORDER BY bm25(contributions_fts, 10.0, 1.0, 3.0) LIMIT 10`
				).bind(ftsQuery).all();

				return Response.json(results);
			} catch (e: any) {
				return new Response(`Search error: ${e.message}`, { status: 500 });
			}
		}

		// 2. Ingestion Endpoint: POST /ingest (Called by GitHub Action)
		if (url.pathname === '/ingest' && request.method === 'POST') {
			// Security: always require a Bearer token (fail-closed).
			// If INGESTION_SECRET is not set the endpoint rejects all callers.
			const authHeader = request.headers.get('Authorization');
			if (!env.INGESTION_SECRET || authHeader !== `Bearer ${env.INGESTION_SECRET}`) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				// Request parsing: parse JSON first so malformed bodies return 400 early.
				let body: any;
				try {
					body = (await request.json()) as any;
				} catch {
					return Response.json(
						{ error: 'Invalid JSON body', code: 'INVALID_JSON' },
						{ status: 400 }
					);
				}

				const { payload, error } = normalizePayload(body);
				if (!payload) {
					return Response.json(
						{
							error: error || 'Invalid ingestion payload',
							code: 'INVALID_PAYLOAD'
						},
						{ status: 400 }
					);
				}

				const insert = env.DB.prepare(
					`INSERT INTO contributions (title, slug, author, content, excerpt, tags, github_issue_url)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				);

				try {
					// DB write: persist canonical payload values after validation succeeds.
					await insert
						.bind(
							payload.title,
							payload.slug,
							payload.author,
							payload.content,
							payload.excerpt,
							payload.tags,
							payload.issue_url
						)
						.run();

					return Response.json(
						{ ok: true, message: 'Content ingested successfully' },
						{ status: 201 }
					);
				} catch (dbError: any) {
					// DB error mapping: convert unique-slug DB errors into stable API codes.
					const message = toSafeString(dbError?.message);
					if (message.includes('UNIQUE constraint failed: contributions.slug')) {
						const conflictError = new Error('Duplicate slug detected');
						(conflictError as any).code = 'SLUG_CONFLICT';
						throw conflictError;
					}
					throw dbError;
				}
			} catch (e: any) {
				// API error envelope: return consistent JSON errors for callers and CI.
				const message = toSafeString(e?.message) || 'Unknown ingestion error';
				if (toSafeString((e as any)?.code) === 'SLUG_CONFLICT') {
					return Response.json(
						{
							error: 'Contribution slug already exists',
							code: 'SLUG_CONFLICT'
						},
						{ status: 409 }
					);
				}
				return Response.json(
					{
						error: `Ingestion failed: ${message}`,
						code: 'INGESTION_ERROR'
					},
					{ status: 500 }
				);
			}
		}

		return new Response('FeathersMCP Cloud API: Use /search or /ingest', { status: 404 });
	},
};

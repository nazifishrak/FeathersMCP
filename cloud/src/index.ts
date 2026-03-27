export interface Env {
	DB: D1Database;
	INGESTION_SECRET?: string;
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
				const body = (await request.json()) as any;
				const { title, slug, author, content, excerpt, tags, issue_url } = body;

				await env.DB.prepare(
					`INSERT INTO contributions (title, slug, author, content, excerpt, tags, github_issue_url) 
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				).bind(title, slug, author, content, excerpt, tags, issue_url).run();

				return new Response('Content ingested successfully', { status: 201 });
			} catch (e: any) {
				return new Response(`Ingestion failed: ${e.message}`, { status: 500 });
			}
		}

		return new Response('FeathersMCP Cloud API: Use /search or /ingest', { status: 404 });
	},
};

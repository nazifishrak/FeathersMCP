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
				// We use FTS5 MATCH for ultra-fast, ranked searching
				const { results } = await env.DB.prepare(
					`SELECT id, title, slug, author, excerpt, tags, github_pr_url, created_at 
					 FROM contributions_fts 
					 JOIN contributions ON contributions.id = contributions_fts.rowid 
					 WHERE contributions_fts MATCH ? 
					 ORDER BY rank LIMIT 10`
				).bind(query).all();

				return Response.json(results);
			} catch (e: any) {
				return new Response(`Search error: ${e.message}`, { status: 500 });
			}
		}

		// 2. Ingestion Endpoint: POST /ingest (Called by GitHub Action)
		if (url.pathname === '/ingest' && request.method === 'POST') {
			// (Security: Check Bearer Token if configured)
			const authHeader = request.headers.get('Authorization');
			if (env.INGESTION_SECRET && authHeader !== `Bearer ${env.INGESTION_SECRET}`) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				const body = (await request.json()) as any;
				const { title, slug, author, content, excerpt, tags, pr_url } = body;

				await env.DB.prepare(
					`INSERT INTO contributions (title, slug, author, content, excerpt, tags, github_pr_url) 
					 VALUES (?, ?, ?, ?, ?, ?, ?)`
				).bind(title, slug, author, content, excerpt, tags, pr_url).run();

				return new Response('Content ingested successfully', { status: 201 });
			} catch (e: any) {
				return new Response(`Ingestion failed: ${e.message}`, { status: 500 });
			}
		}

		return new Response('FeatherMCP Cloud API: Use /search or /ingest', { status: 404 });
	},
};

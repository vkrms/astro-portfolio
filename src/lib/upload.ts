import { resizeImage } from './resize';

/**
 * Resizes an image in the browser and stores it on the server. Returns the
 * public path, or null when the file cannot be decoded or the upload fails.
 */
export async function uploadImage(file: File, slug: string): Promise<string | null> {
	let resized: Blob;
	try {
		resized = await resizeImage(file);
	} catch {
		return null;
	}

	const form = new FormData();
	form.append('file', resized, file.name);
	form.append('slug', slug);

	const response = await fetch('/api/media', { method: 'POST', body: form });
	if (!response.ok) return null;

	return ((await response.json()) as { path: string }).path;
}

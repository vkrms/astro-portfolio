const MAX_EDGE = 3000;
const MAX_BYTES = 3.5 * 1024 * 1024;

/**
 * Resizes an image in the browser before upload: long edge <= 3000 px and
 * target <= 3.5 MB, so it stays under the Vercel function body limit.
 */
export async function resizeImage(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);

	const context = canvas.getContext('2d');
	if (!context) throw new Error('Canvas is not available');
	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

	const encode = (quality: number) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

	let blob = await encode(0.9);
	if (!blob) throw new Error('Could not encode the image');
	if (blob.size > MAX_BYTES) blob = (await encode(0.7)) ?? blob;

	return blob;
}

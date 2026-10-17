import { useContext, useRef, useState } from 'react';
import { SlugContext } from './context';
import { uploadImage } from '../lib/upload';

/**
 * Image block backed by the local media pipeline. The file is resized in the
 * browser, stored under /uploads/<slug>/ and referenced by `src`. Alt text is
 * required but enforced on save, not on upload, so the author can fill it after
 * picking the file.
 */
export function ImageBlock({ block, editor }: { block: any; editor: any }) {
	const slug = useContext(SlugContext);
	const fileRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	const src = String(block.props.src ?? '');
	const alt = String(block.props.alt ?? '');
	const caption = String(block.props.caption ?? '');

	const update = (props: Record<string, string>) => editor.updateBlock(block, { props });

	async function addFile(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;

		setBusy(true);
		try {
			const path = await uploadImage(file, slug);
			if (path) update({ src: path });
		} finally {
			setBusy(false);
			if (fileRef.current) fileRef.current.value = '';
		}
	}

	return (
		<div
			role="group"
			aria-label="Image"
			className="my-2 grid gap-3 rounded-md border border-dashed p-3"
		>
			{src ? (
				<>
					<img src={src} alt={alt} className="max-h-80 w-full rounded-md object-contain" />

					<label className="grid gap-1 text-xs">
						<span>Alt text</span>
						<input
							name="alt"
							value={alt}
							onChange={(event) => update({ alt: event.target.value })}
							className="rounded border px-2 py-1"
						/>
					</label>

					<label className="grid gap-1 text-xs">
						<span>Caption</span>
						<input
							name="caption"
							value={caption}
							onChange={(event) => update({ caption: event.target.value })}
							className="rounded border px-2 py-1"
						/>
					</label>

					<div className="flex gap-2 text-xs">
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							className="rounded border px-2 py-1"
						>
							Replace
						</button>
						<button
							type="button"
							onClick={() => update({ src: '', alt: '', caption: '' })}
							className="rounded border px-2 py-1 text-destructive"
						>
							Remove
						</button>
					</div>
				</>
			) : (
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					disabled={busy}
					className="w-fit rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
				>
					{busy ? 'Uploading…' : 'Add image'}
				</button>
			)}

			<input
				ref={fileRef}
				type="file"
				name="file"
				accept="image/*"
				onChange={(event) => addFile(event.target.files)}
				className="hidden"
			/>
		</div>
	);
}

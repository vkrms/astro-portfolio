import { useContext, useRef, useState } from 'react';
import { SlugContext } from './context';
import { uploadImage } from '../lib/upload';

/**
 * Media + text block: one image beside inline text. The image sits on the left
 * by default and stacks above the text on narrow screens.
 */
export function MediaTextBlock({ block, editor, contentRef }: any) {
	const slug = useContext(SlugContext);
	const fileRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	const src = String(block.props.src ?? '');
	const alt = String(block.props.alt ?? '');
	const side = String(block.props.side ?? 'left');

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
			aria-label="Media and text"
			className="my-2 grid gap-3 rounded-md border border-dashed p-3"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className={side === 'right' ? 'grid content-start gap-2 sm:order-2' : 'grid content-start gap-2'}>
					{src ? (
						<img src={src} alt={alt} className="w-full rounded-md object-cover" />
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

					{src && (
						<label className="grid gap-1 text-xs">
							<span>Alt text</span>
							<input
								name="alt"
								value={alt}
								onChange={(event) => update({ alt: event.target.value })}
								className="rounded border px-2 py-1"
							/>
						</label>
					)}

					<div className="flex flex-wrap items-center gap-2 text-xs">
						<label className="grid gap-1">
							<span>Image side</span>
							<select
								name="side"
								value={side}
								onChange={(event) => update({ side: event.target.value })}
								className="rounded-md border bg-card px-2 py-1"
							>
								<option value="left">Left</option>
								<option value="right">Right</option>
							</select>
						</label>

						{src && (
							<>
								<button
									type="button"
									onClick={() => fileRef.current?.click()}
									className="rounded border px-2 py-1"
								>
									Replace
								</button>
								<button
									type="button"
									onClick={() => update({ src: '', alt: '' })}
									className="rounded border px-2 py-1 text-destructive"
								>
									Remove
								</button>
							</>
						)}
					</div>
				</div>

				<div ref={contentRef} className="prose max-w-none" />
			</div>
		</div>
	);
}

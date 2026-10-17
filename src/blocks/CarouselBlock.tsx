import { useContext, useRef, useState } from 'react';
import { SlugContext } from './context';
import { ASPECT_RATIOS, parseCarouselItems, type CarouselItem } from './shared';
import { uploadImage } from '../lib/upload';

/**
 * Carousel block. Items live in one JSON string prop because BlockNote props
 * only hold strings, numbers and booleans.
 */
export function CarouselBlock({ block, editor }: { block: any; editor: any }) {
	const slug = useContext(SlugContext);
	const items = parseCarouselItems(block.props.items);
	const fileRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	const update = (next: CarouselItem[]) => {
		editor.updateBlock(block, { props: { items: JSON.stringify(next) } });
	};

	const updateItem = (index: number, patch: Partial<CarouselItem>) => {
		update(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	};

	const move = (index: number, delta: number) => {
		const target = index + delta;
		if (target < 0 || target >= items.length) return;

		const next = [...items];
		[next[index], next[target]] = [next[target], next[index]];
		update(next);
	};

	const remove = (index: number) => {
		update(items.filter((_, i) => i !== index));
	};

	async function addFiles(files: FileList | null) {
		if (!files?.length) return;

		setBusy(true);
		try {
			const added: CarouselItem[] = [];
			for (const file of Array.from(files)) {
				const path = await uploadImage(file, slug);
				if (path) added.push({ src: path, alt: '', caption: '' });
			}

			if (added.length) update([...items, ...added]);
		} finally {
			setBusy(false);
			if (fileRef.current) fileRef.current.value = '';
		}
	}

	return (
		<div className="my-2 grid gap-3 rounded-md border border-dashed p-3">
			<div className="flex items-center justify-between gap-3">
				<span className="text-sm font-medium">Carousel</span>
				<select
					aria-label="Aspect ratio"
					name="aspect"
					value={block.props.aspect}
					onChange={(event) =>
						editor.updateBlock(block, { props: { aspect: event.target.value } })
					}
					className="rounded-md border bg-card px-2 py-1 text-sm"
				>
					{ASPECT_RATIOS.map((ratio) => (
						<option key={ratio} value={ratio}>
							{ratio}
						</option>
					))}
				</select>
			</div>

			{items.map((item, index) => (
				<div key={`${item.src}-${index}`} className="grid gap-2 rounded-md border bg-card p-3">
					<img src={item.src} alt={item.alt} className="h-32 w-full rounded object-cover" />

					<label className="grid gap-1 text-xs">
						<span>Alt text</span>
						<input
							name="alt"
							value={item.alt}
							onChange={(event) => updateItem(index, { alt: event.target.value })}
							className="rounded border px-2 py-1"
						/>
					</label>

					<label className="grid gap-1 text-xs">
						<span>Caption</span>
						<input
							name="caption"
							value={item.caption}
							onChange={(event) => updateItem(index, { caption: event.target.value })}
							className="rounded border px-2 py-1"
						/>
					</label>

					<div className="flex gap-2 text-xs">
						<button
							type="button"
							onClick={() => move(index, -1)}
							className="rounded border px-2 py-1"
						>
							Up
						</button>
						<button
							type="button"
							onClick={() => move(index, 1)}
							className="rounded border px-2 py-1"
						>
							Down
						</button>
						<button
							type="button"
							onClick={() => remove(index)}
							className="rounded border px-2 py-1 text-destructive"
						>
							Remove
						</button>
					</div>
				</div>
			))}

			<div>
				<input
					ref={fileRef}
					type="file"
					name="file"
					accept="image/*"
					multiple
					onChange={(event) => addFiles(event.target.files)}
					className="hidden"
				/>
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					disabled={busy}
					className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
				>
					{busy ? 'Uploading…' : 'Add image'}
				</button>
			</div>
		</div>
	);
}

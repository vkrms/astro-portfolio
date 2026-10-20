import { parseEmbedUrl } from './embed';
import { ASPECT_RATIOS } from './shared';

/**
 * Embed block. The editor stores the source URL, a required accessible title
 * and an aspect ratio; the public renderer shows a click-to-load facade.
 */
export function EmbedBlock({ block, editor }: { block: any; editor: any }) {
	const url = String(block.props.url ?? '');
	const title = String(block.props.title ?? '');
	const aspect = String(block.props.aspect ?? '16/9');
	const info = parseEmbedUrl(url);

	const update = (props: Record<string, string>) => editor.updateBlock(block, { props });

	return (
		<div role="group" aria-label="Embed" className="my-2 grid gap-3 rounded-md border border-dashed p-3">
			<label className="grid gap-1 text-xs">
				<span>URL</span>
				<input
					name="url"
					type="url"
					value={url}
					onChange={(event) => update({ url: event.target.value })}
					placeholder="https://www.youtube.com/watch?v=…"
					className="rounded border px-2 py-1"
				/>
			</label>

			<label className="grid gap-1 text-xs">
				<span>Title (required)</span>
				<input
					name="title"
					value={title}
					onChange={(event) => update({ title: event.target.value })}
					className="rounded border px-2 py-1"
				/>
			</label>

			<label className="grid w-fit gap-1 text-xs">
				<span>Aspect ratio</span>
				<select
					name="aspect"
					value={aspect}
					onChange={(event) => update({ aspect: event.target.value })}
					className="rounded-md border bg-card px-2 py-1 text-sm"
				>
					{ASPECT_RATIOS.map((ratio) => (
						<option key={ratio} value={ratio}>
							{ratio}
						</option>
					))}
				</select>
			</label>

			{info ? (
				<div className="grid gap-2 rounded-md border bg-card p-2 text-xs text-muted-foreground">
					<span className="font-medium text-foreground">{info.label}</span>
					<span className="truncate">{info.embedUrl}</span>
					{info.thumbnail && (
						<img src={info.thumbnail} alt="" className="max-h-48 w-full rounded object-cover" />
					)}
				</div>
			) : (
				url && <p className="text-xs text-destructive">This URL cannot be embedded.</p>
			)}
		</div>
	);
}

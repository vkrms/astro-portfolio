/**
 * Quote block: inline content plus an optional attribution. Inline content
 * comes from BlockNote through `contentRef`.
 */
export function QuoteBlock({ block, editor, contentRef }: any) {
	const attribution = String(block.props.attribution ?? '');

	return (
		<div role="group" aria-label="Quote" className="my-2 grid gap-2 rounded-md border border-dashed p-3">
			<blockquote className="border-l-2 pl-3 italic">
				<div ref={contentRef} />
			</blockquote>

			<label className="grid gap-1 text-xs">
				<span>Attribution</span>
				<input
					name="attribution"
					value={attribution}
					onChange={(event) =>
						editor.updateBlock(block, { props: { attribution: event.target.value } })
					}
					placeholder="Optional"
					className="rounded border px-2 py-1"
				/>
			</label>
		</div>
	);
}

import { useEffect, useState } from 'react';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import {
	SuggestionMenuController,
	getDefaultReactSlashMenuItems,
	useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { SlugContext } from '../../blocks/context';
import { schema } from '../../blocks/schema';
import type { PostRecord } from '../../lib/storage';

interface Props {
	slug: string;
	post: PostRecord | null;
}

export default function PostEditor({ slug, post }: Props) {
	const [title, setTitle] = useState(post?.title ?? '');
	const [pageSlug, setPageSlug] = useState(slug === 'new' ? '' : slug);
	const [summary, setSummary] = useState(post?.summary ?? '');
	const [date, setDate] = useState(post?.date ?? new Date().toISOString().slice(0, 10));
	const [draft, setDraft] = useState(post?.draft ?? true);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const [dark, setDark] = useState(false);

	const initialContent = post?.body?.length ? (post.body as any) : undefined;
	const editor = useCreateBlockNote({ schema, initialContent });

	useEffect(() => {
		setDark(document.documentElement.classList.contains('dark'));
	}, []);

	async function save() {
		setSaving(true);

		try {
			const response = await fetch('/api/save', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: pageSlug || undefined,
					title,
					summary,
					date,
					draft,
					body: editor.document,
				}),
			});

			if (!response.ok) {
				window.alert(await response.text());
				return;
			}

			window.location.href = '/admin';
		} finally {
			setSaving(false);
		}
	}

	async function togglePreview() {
		const response = await fetch('/api/preview', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ blocks: editor.document }),
		});

		setPreview(await response.text());
	}

	return (
		<SlugContext.Provider value={pageSlug || 'draft'}>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
				className="mt-6 grid gap-5"
			>
				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Title</span>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						required
						maxLength={80}
						className="rounded-md border bg-card px-3 py-2"
					/>
				</label>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Slug</span>
					<input
						value={pageSlug}
						onChange={(event) => setPageSlug(event.target.value)}
						placeholder="auto from title"
						className="rounded-md border bg-card px-3 py-2"
					/>
				</label>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Summary</span>
					<textarea
						value={summary}
						onChange={(event) => setSummary(event.target.value)}
						required
						maxLength={160}
						rows={3}
						className="rounded-md border bg-card px-3 py-2"
					/>
				</label>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Date</span>
					<input
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
						required
						className="rounded-md border bg-card px-3 py-2"
					/>
				</label>

				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={draft}
						onChange={(event) => setDraft(event.target.checked)}
						className="size-4"
					/>
					<span>Draft</span>
				</label>

				<div className="rounded-xl border bg-card p-2">
					<BlockNoteView editor={editor} theme={dark ? 'dark' : 'light'} slashMenu={false}>
						<SuggestionMenuController
							triggerCharacter="/"
							getItems={async (query) =>
								filterSuggestionItems(
									[
										...getDefaultReactSlashMenuItems(editor),
										{
											title: 'Carousel',
											subtext: 'Slideshow of images',
											aliases: ['carousel', 'gallery', 'slideshow', 'images'],
											group: 'Media',
											icon: <span aria-hidden="true">▤</span>,
											onItemClick: () => {
												insertOrUpdateBlockForSlashMenu(editor, { type: 'carousel' });
											},
										},
									],
									query,
								)
							}
						/>
					</BlockNoteView>
				</div>

				{preview && (
					<div
						className="prose max-w-none rounded-xl border bg-card p-6"
						dangerouslySetInnerHTML={{ __html: preview }}
					/>
				)}

				<div className="flex items-center gap-3">
					<button
						type="submit"
						disabled={saving}
						className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					<button
						type="button"
						onClick={togglePreview}
						className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
					>
						Preview
					</button>
				</div>
			</form>
		</SlugContext.Provider>
	);
}

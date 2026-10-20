import { useEffect, useRef, useState } from 'react';
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
import { findEmbedWithoutTitle, findImageWithoutAlt, normalizeBlocks } from '../../blocks/shared';
import { schema } from '../../blocks/schema';
import { initCarousels } from '../../scripts/carousel';
import { initEmbeds } from '../../scripts/embeds';
import { uploadImage } from '../../lib/upload';
import type { PostLink, PostRecord } from '../../lib/storage';

interface Props {
	slug: string;
	post: PostRecord | null;
}

// BlockNote defaults that Blocks.astro can render. Everything else stays out
// of the slash menu so it cannot be saved and then dropped from the page.
const SLASH_BLOCK_KEYS = new Set([
	'paragraph',
	'heading_2',
	'heading_3',
	'bullet_list',
	'numbered_list',
	'code_block',
	'quote',
]);

export default function PostEditor({ slug, post }: Props) {
	const [title, setTitle] = useState(post?.title ?? '');
	const [pageSlug, setPageSlug] = useState(slug === 'new' ? '' : slug);
	const [summary, setSummary] = useState(post?.summary ?? '');
	const [date, setDate] = useState(post?.date ?? new Date().toISOString().slice(0, 10));
	const [draft, setDraft] = useState(post?.draft ?? true);
	const [featured, setFeatured] = useState(post?.featured ?? false);
	const [cover, setCover] = useState(post?.cover ?? '');
	const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? '');
	const [tags, setTags] = useState((post?.tags ?? []).join(', '));
	const [role, setRole] = useState(post?.role ?? '');
	const [client, setClient] = useState(post?.client ?? '');
	const [links, setLinks] = useState<PostLink[]>(post?.links ?? []);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dark, setDark] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const coverRef = useRef<HTMLInputElement>(null);

	const initialContent = post?.body?.length ? (normalizeBlocks(post.body) as any) : undefined;
	const editor = useCreateBlockNote({ schema, initialContent });

	useEffect(() => {
		setDark(document.documentElement.classList.contains('dark'));
	}, []);

	useEffect(() => {
		const element = titleRef.current;
		if (!element) return;

		element.style.height = '0px';
		element.style.height = `${element.scrollHeight}px`;
	}, [title]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (previewOpen && !dialog.open) dialog.showModal();
		if (!previewOpen && dialog.open) dialog.close();
	}, [previewOpen]);

	useEffect(() => {
		if (previewOpen && previewRef.current) {
			initCarousels(previewRef.current);
			initEmbeds(previewRef.current);
		}
	}, [previewOpen, preview]);

	async function addCover(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;

		const path = await uploadImage(file, pageSlug || 'draft');
		if (path) setCover(path);
		if (coverRef.current) coverRef.current.value = '';
	}

	function updateLink(index: number, patch: Partial<PostLink>) {
		setLinks(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
	}

	async function save() {
		setSaving(true);
		setError(null);

		try {
			if (cover && !coverAlt.trim()) {
				setError('Add alt text to the cover image before saving.');
				return;
			}

			if (findImageWithoutAlt(editor.document)) {
				setError('Add alt text to every image before saving.');
				return;
			}

			if (findEmbedWithoutTitle(editor.document)) {
				setError('Add a title to every embed before saving.');
				return;
			}

			const response = await fetch('/api/save', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: pageSlug || undefined,
					title,
					summary,
					date,
					draft,
					featured,
					cover: cover || undefined,
					coverAlt: coverAlt || undefined,
					tags: tags
						.split(',')
						.map((tag) => tag.trim())
						.filter(Boolean),
					role: role || undefined,
					client: client || undefined,
					links: links.filter((link) => link.label.trim() && link.url.trim()),
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

	async function openPreview() {
		setPreviewLoading(true);

		try {
			const response = await fetch('/api/preview', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ blocks: editor.document }),
			});

			// Scripts do not run when injected as HTML. The carousel is initialized
			// explicitly below; drop Astro's script tag so it cannot 404.
			setPreview((await response.text()).replace(/<script[\s\S]*?<\/script>/gi, ''));
			setPreviewOpen(true);
		} finally {
			setPreviewLoading(false);
		}
	}

	function closePreview() {
		setPreviewOpen(false);
	}

	return (
		<SlugContext.Provider value={pageSlug || 'draft'}>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
				className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
			>
				<div className="min-w-0">
					<div className="editor-surface rounded-xl border bg-card p-3 focus-within:ring-2 focus-within:ring-ring/40">
						<label className="sr-only" htmlFor="title">
							Title
						</label>
						<textarea
							id="title"
							name="title"
							ref={titleRef}
							rows={1}
							value={title}
							onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
							onKeyDown={(event) => {
								if (event.key === 'Enter') event.preventDefault();
							}}
							placeholder="Add title"
							required
							maxLength={128}
							className="editor-title mb-2 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40 lg:text-4xl"
						/>

						<div className="min-h-[40vh] lg:min-h-[60vh]">
							<BlockNoteView editor={editor} theme={dark ? 'dark' : 'light'} slashMenu={false}>
								<SuggestionMenuController
									triggerCharacter="/"
									getItems={async (query) =>
										filterSuggestionItems(
											[
												{
													title: 'Image',
													subtext: 'Single image with alt text',
													aliases: ['image', 'photo', 'picture'],
													group: 'Media',
													icon: <span aria-hidden="true">▣</span>,
													onItemClick: () => {
														insertOrUpdateBlockForSlashMenu(editor, { type: 'image' });
													},
												},
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
												{
													title: 'Gallery',
													subtext: 'Grid of images',
													aliases: ['gallery', 'grid', 'photos'],
													group: 'Media',
													icon: <span aria-hidden="true">▦</span>,
													onItemClick: () => {
														insertOrUpdateBlockForSlashMenu(editor, { type: 'gallery' });
													},
												},
												{
													title: 'Embed',
													subtext: 'YouTube, Vimeo, Figma or CodePen',
													aliases: ['embed', 'video', 'youtube', 'vimeo', 'figma'],
													group: 'Media',
													icon: <span aria-hidden="true">▶</span>,
													onItemClick: () => {
														insertOrUpdateBlockForSlashMenu(editor, { type: 'embed' });
													},
												},
												{
													title: 'Media and text',
													subtext: 'Image beside text',
													aliases: ['media', 'image text', 'columns'],
													group: 'Media',
													icon: <span aria-hidden="true">▥</span>,
													onItemClick: () => {
														insertOrUpdateBlockForSlashMenu(editor, { type: 'mediaText' });
													},
												},
												...getDefaultReactSlashMenuItems(editor).filter((item) =>
													SLASH_BLOCK_KEYS.has((item as { key?: string }).key ?? ''),
												),
											],
											query,
										)
									}
								/>
							</BlockNoteView>
						</div>
					</div>
				</div>

				<aside className="grid gap-4 lg:sticky lg:top-20">
					<section className="grid gap-3 rounded-xl border bg-card p-4">
						<h2 className="text-sm font-semibold">Publish</h2>

						<label className="flex items-center gap-2 text-sm">
							<input
								id="draft"
								name="draft"
								type="checkbox"
								checked={draft}
								onChange={(event) => setDraft(event.target.checked)}
								className="size-4"
							/>
							<span>Draft</span>
						</label>
						<p className="text-xs text-muted-foreground">Uncheck to publish.</p>

						<label className="flex items-center gap-2 text-sm">
							<input
								id="featured"
								name="featured"
								type="checkbox"
								checked={featured}
								onChange={(event) => setFeatured(event.target.checked)}
								className="size-4"
							/>
							<span>Featured</span>
						</label>
						<p className="text-xs text-muted-foreground">Show on the home page.</p>

						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}

						<button
							type="submit"
							disabled={saving}
							className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
						>
							{saving ? 'Saving…' : 'Save'}
						</button>
						<button
							type="button"
							onClick={openPreview}
							disabled={previewLoading}
							className="inline-flex h-9 w-full items-center justify-center rounded-md border px-4 text-sm font-medium disabled:opacity-50"
						>
							{previewLoading ? 'Loading…' : 'Preview'}
						</button>
					</section>

					<section className="grid gap-4 rounded-xl border bg-card p-4">
						<h2 className="text-sm font-semibold">Post settings</h2>

						<div className="grid gap-1.5">
							<label htmlFor="summary" className="text-sm font-medium">
								Excerpt
							</label>
							<textarea
								id="summary"
								name="summary"
								value={summary}
								onChange={(event) => setSummary(event.target.value)}
								required
								maxLength={160}
								rows={4}
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
							<span className="text-xs text-muted-foreground">
								Used on cards and as the meta description.
							</span>
						</div>

						<label className="grid gap-1.5">
							<span className="text-sm font-medium">Slug</span>
							<input
								id="slug"
								name="slug"
								value={pageSlug}
								onChange={(event) => setPageSlug(event.target.value)}
								placeholder="auto from title"
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
						</label>

						<label className="grid gap-1.5">
							<span className="text-sm font-medium">Date</span>
							<input
								id="date"
								name="date"
								type="date"
								value={date}
								onChange={(event) => setDate(event.target.value)}
								required
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
						</label>

						<label className="grid gap-1.5">
							<span className="text-sm font-medium">Tags</span>
							<input
								id="tags"
								name="tags"
								value={tags}
								onChange={(event) => setTags(event.target.value)}
								placeholder="design, astro"
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
							<span className="text-xs text-muted-foreground">
								Comma separated. Drives the /projects filter.
							</span>
						</label>

						<label className="grid gap-1.5">
							<span className="text-sm font-medium">Role</span>
							<input
								id="role"
								name="role"
								value={role}
								onChange={(event) => setRole(event.target.value)}
								placeholder="Design and front end"
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
						</label>

						<label className="grid gap-1.5">
							<span className="text-sm font-medium">Client</span>
							<input
								id="client"
								name="client"
								value={client}
								onChange={(event) => setClient(event.target.value)}
								className="rounded-md border bg-background px-3 py-2 text-sm"
							/>
						</label>

						<div className="grid gap-2">
							<span className="text-sm font-medium">Cover</span>
							{cover ? (
								<>
									<img
										src={cover}
										alt={coverAlt}
										className="aspect-[16/9] w-full rounded-md border object-cover"
									/>
									<input
										aria-label="Cover alt text"
										value={coverAlt}
										onChange={(event) => setCoverAlt(event.target.value)}
										placeholder="Cover alt text"
										className="rounded-md border bg-background px-3 py-2 text-sm"
									/>
									<div className="flex gap-2 text-xs">
										<button
											type="button"
											onClick={() => coverRef.current?.click()}
											className="rounded border px-2 py-1"
										>
											Replace
										</button>
										<button
											type="button"
											onClick={() => {
												setCover('');
												setCoverAlt('');
											}}
											className="rounded border px-2 py-1 text-destructive"
										>
											Remove
										</button>
									</div>
								</>
							) : (
								<button
									type="button"
									onClick={() => coverRef.current?.click()}
									className="w-fit rounded-md border px-3 py-1.5 text-sm"
								>
									Add cover image
								</button>
							)}
							<input
								ref={coverRef}
								type="file"
								accept="image/*"
								onChange={(event) => addCover(event.target.files)}
								className="hidden"
							/>
							<span className="text-xs text-muted-foreground">
								Used at the top of the post and as the OG image.
							</span>
						</div>

						<div className="grid gap-2">
							<span className="text-sm font-medium">Links</span>
							{links.map((link, index) => (
								<div key={index} className="grid gap-2 rounded-md border p-2">
									<input
										aria-label={`Link ${index + 1} label`}
										value={link.label}
										onChange={(event) => updateLink(index, { label: event.target.value })}
										placeholder="Label"
										className="rounded border px-2 py-1 text-sm"
									/>
									<input
										aria-label={`Link ${index + 1} URL`}
										value={link.url}
										onChange={(event) => updateLink(index, { url: event.target.value })}
										placeholder="https://…"
										className="rounded border px-2 py-1 text-sm"
									/>
									<button
										type="button"
										onClick={() => setLinks(links.filter((_, i) => i !== index))}
										className="w-fit text-xs text-destructive"
									>
										Remove
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => setLinks([...links, { label: '', url: '' }])}
								className="w-fit rounded-md border px-3 py-1 text-sm"
							>
								Add link
							</button>
						</div>
					</section>
				</aside>
			</form>

			<dialog
				ref={dialogRef}
				aria-label="Preview"
				onClose={() => setPreviewOpen(false)}
				onClick={(event) => {
					if (event.target === dialogRef.current) closePreview();
				}}
				className="m-auto w-[min(48rem,92vw)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50"
			>
				<div className="flex max-h-[85vh] flex-col">
					<header className="flex items-center justify-between gap-4 border-b px-5 py-3">
						<h2 className="text-sm font-semibold">Preview</h2>
						<button
							type="button"
							onClick={closePreview}
							className="rounded-md border px-3 py-1 text-sm"
						>
							Close
						</button>
					</header>
					<div
						ref={previewRef}
						className="prose max-w-none overflow-y-auto p-6"
						dangerouslySetInnerHTML={{ __html: preview ?? '' }}
					/>
				</div>
			</dialog>
		</SlugContext.Provider>
	);
}

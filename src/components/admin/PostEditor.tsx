import { useCallback, useEffect, useRef, useState } from 'react';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import {
	SuggestionMenuController,
	getDefaultReactSlashMenuItems,
	useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Checkbox } from '@admin/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@admin/components/ui/dialog';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import { Textarea } from '@admin/components/ui/textarea';
import { useDarkMode } from '@admin/hooks/use-dark-mode';
import { SlugContext } from '../../blocks/context';
import { findEmbedWithoutTitle, normalizeBlocks } from '../../blocks/shared';
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
	// What is on disk. The public page only exists for a saved, published post.
	const [saved, setSaved] = useState(post ? { slug: post.slug, draft: post.draft } : null);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const dark = useDarkMode();
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const coverRef = useRef<HTMLInputElement>(null);

	const initialContent = post?.body?.length ? (normalizeBlocks(post.body) as any) : undefined;
	const editor = useCreateBlockNote({ schema, initialContent });

	useEffect(() => {
		const element = titleRef.current;
		if (!element) return;

		element.style.height = '0px';
		element.style.height = `${element.scrollHeight}px`;
	}, [title]);

	// Radix mounts the dialog content on each open; init the preview scripts
	// once the node exists.
	const previewMounted = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;
		initCarousels(node);
		initEmbeds(node);
	}, []);

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
				toast.error(await response.text());
				return;
			}

			// Stay on the editor. A new post (or a changed slug) now has a real
			// URL, so point the address bar at it without reloading.
			const { post: record } = (await response.json()) as {
				post: { slug: string; draft: boolean };
			};
			setSaved({ slug: record.slug, draft: record.draft });
			setPageSlug(record.slug);
			window.history.replaceState(null, '', `/admin/edit/${record.slug}`);
			toast.success('Saved.');
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
					<Card className="gap-4 py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm">Publish</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-3 px-4">
							<div className="grid gap-1">
								<div className="flex items-center gap-2">
									<Checkbox
										id="draft"
										name="draft"
										checked={draft}
										onCheckedChange={(checked) => setDraft(checked === true)}
									/>
									<Label htmlFor="draft">Draft</Label>
								</div>
								<p className="text-xs text-muted-foreground">Uncheck to publish.</p>
							</div>

							<div className="grid gap-1">
								<div className="flex items-center gap-2">
									<Checkbox
										id="featured"
										name="featured"
										checked={featured}
										onCheckedChange={(checked) => setFeatured(checked === true)}
									/>
									<Label htmlFor="featured">Featured</Label>
								</div>
								<p className="text-xs text-muted-foreground">Show on the home page.</p>
							</div>

							{error && (
								<p role="alert" className="text-sm text-destructive">
									{error}
								</p>
							)}

							<Button type="submit" disabled={saving} className="w-full">
								{saving ? 'Saving…' : 'Save'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={openPreview}
								disabled={previewLoading}
								className="w-full"
							>
								{previewLoading ? 'Loading…' : 'Preview'}
							</Button>
							{saved && !saved.draft ? (
								<Button type="button" variant="outline" asChild className="w-full">
									<a href={`/projects/${saved.slug}`} target="_blank" rel="noopener">
										View on site
										<ExternalLink aria-hidden="true" />
									</a>
								</Button>
							) : (
								<p className="text-xs text-muted-foreground">
									Save a published post (Draft unchecked) to view it on the site.
								</p>
							)}
						</CardContent>
					</Card>

					<Card className="gap-4 py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm">Post settings</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 px-4">
							<div className="grid gap-1.5">
								<Label htmlFor="summary">Excerpt</Label>
								<Textarea
									id="summary"
									name="summary"
									value={summary}
									onChange={(event) => setSummary(event.target.value)}
									required
									maxLength={280}
									rows={4}
								/>
								<span className="text-xs text-muted-foreground">
									Used on cards and as the meta description.
								</span>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="slug">Slug</Label>
								<Input
									id="slug"
									name="slug"
									value={pageSlug}
									onChange={(event) => setPageSlug(event.target.value)}
									placeholder="auto from title"
								/>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="date">Date</Label>
								<Input
									id="date"
									name="date"
									type="date"
									value={date}
									onChange={(event) => setDate(event.target.value)}
									required
								/>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="tags">Tags</Label>
								<Input
									id="tags"
									name="tags"
									value={tags}
									onChange={(event) => setTags(event.target.value)}
									placeholder="design, astro"
								/>
								<span className="text-xs text-muted-foreground">
									Comma separated. Drives the /projects filter.
								</span>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="role">Role</Label>
								<Input
									id="role"
									name="role"
									value={role}
									onChange={(event) => setRole(event.target.value)}
									placeholder="Design and front end"
								/>
							</div>

							<div className="grid gap-1.5">
								<Label htmlFor="client">Client</Label>
								<Input
									id="client"
									name="client"
									value={client}
									onChange={(event) => setClient(event.target.value)}
								/>
							</div>

							<div className="grid gap-2">
								<span className="text-sm font-medium">Cover</span>
								{cover ? (
									<>
										<img
											src={cover}
											alt={coverAlt}
											className="aspect-[16/9] w-full rounded-md border object-cover"
										/>
										<Input
											aria-label="Cover alt text"
											value={coverAlt}
											onChange={(event) => setCoverAlt(event.target.value)}
											placeholder="Cover alt text"
										/>
										<div className="flex gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => coverRef.current?.click()}
											>
												Replace
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="text-destructive"
												onClick={() => {
													setCover('');
													setCoverAlt('');
												}}
											>
												Remove
											</Button>
										</div>
									</>
								) : (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => coverRef.current?.click()}
									>
										Add cover image
									</Button>
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
										<Input
											aria-label={`Link ${index + 1} label`}
											value={link.label}
											onChange={(event) => updateLink(index, { label: event.target.value })}
											placeholder="Label"
										/>
										<Input
											aria-label={`Link ${index + 1} URL`}
											value={link.url}
											onChange={(event) => updateLink(index, { url: event.target.value })}
											placeholder="https://…"
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="w-fit text-destructive"
											onClick={() => setLinks(links.filter((_, i) => i !== index))}
										>
											Remove
										</Button>
									</div>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-fit"
									onClick={() => setLinks([...links, { label: '', url: '' }])}
								>
									Add link
								</Button>
							</div>
						</CardContent>
					</Card>
				</aside>
			</form>

			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent
					showCloseButton={false}
					aria-describedby={undefined}
					className="flex max-h-[85vh] w-[min(48rem,92vw)] max-w-none flex-col gap-0 p-0 sm:max-w-none"
				>
					<DialogHeader className="flex-row items-center justify-between gap-4 border-b px-5 py-3">
						<DialogTitle className="text-sm">Preview</DialogTitle>
						<Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
							Close
						</Button>
					</DialogHeader>
					<div
						ref={previewMounted}
						className="prose max-w-none overflow-y-auto p-6"
						dangerouslySetInnerHTML={{ __html: preview ?? '' }}
					/>
				</DialogContent>
			</Dialog>
		</SlugContext.Provider>
	);
}

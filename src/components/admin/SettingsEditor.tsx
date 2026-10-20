import { useEffect, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { findImageWithoutAlt, normalizeBlocks } from '../../blocks/shared';
import { schema } from '../../blocks/schema';
import { uploadImage } from '../../lib/upload';
import type { AboutSettings, HomeSettings, SiteSettings } from '../../lib/schema';

interface PostOption {
	slug: string;
	title: string;
	draft: boolean;
}

interface Props {
	site: SiteSettings;
	home: HomeSettings;
	about: AboutSettings;
	posts: PostOption[];
}

const inputClass = 'rounded-md border bg-background px-3 py-2 text-sm';

export default function SettingsEditor({ site: initialSite, home: initialHome, about, posts }: Props) {
	const [site, setSite] = useState(initialSite);
	const [intro, setIntro] = useState(initialHome.intro);
	const [featured, setFeatured] = useState(initialHome.featured);
	const [portrait, setPortrait] = useState(about.portrait ?? '');
	const [portraitAlt, setPortraitAlt] = useState(about.portraitAlt ?? '');
	const [toAdd, setToAdd] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [dark, setDark] = useState(false);
	const portraitRef = useRef<HTMLInputElement>(null);

	const editor = useCreateBlockNote({
		schema,
		initialContent: about.body.length ? (normalizeBlocks(about.body) as any) : undefined,
	});

	useEffect(() => {
		setDark(document.documentElement.classList.contains('dark'));
	}, []);

	const available = posts.filter((post) => !post.draft && !featured.includes(post.slug));

	function updateSite(patch: Partial<SiteSettings>) {
		setSite((current) => ({ ...current, ...patch }));
		setSaved(false);
	}

	function updateNav(index: number, patch: { title?: string; link?: string }) {
		updateSite({ nav: site.nav.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
	}

	function updateContact(index: number, patch: { title?: string; link?: string; icon?: string }) {
		updateSite({
			contactLinks: site.contactLinks.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		});
	}

	function moveFeatured(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= featured.length) return;

		const next = [...featured];
		[next[index], next[target]] = [next[target], next[index]];
		setFeatured(next);
		setSaved(false);
	}

	async function addPortrait(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;

		const path = await uploadImage(file, 'settings');
		if (path) {
			setPortrait(path);
			setSaved(false);
		}
		if (portraitRef.current) portraitRef.current.value = '';
	}

	async function save() {
		setSaving(true);
		setError(null);
		setSaved(false);

		try {
			if (findImageWithoutAlt(editor.document)) {
				setError('Add alt text to every image in the about page before saving.');
				return;
			}

			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					site,
					home: { intro, featured },
					about: {
						body: editor.document,
						portrait: portrait || undefined,
						portraitAlt: portraitAlt || undefined,
					},
				}),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				setError(payload?.error ?? 'Could not save settings.');
				return;
			}

			setSaved(true);
		} finally {
			setSaving(false);
		}
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
			className="grid gap-6"
		>
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="submit"
					disabled={saving}
					className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save settings'}
				</button>
				{saved && <span className="text-sm text-muted-foreground">Saved.</span>}
				{error && (
					<span role="alert" className="text-sm text-destructive">
						{error}
					</span>
				)}
			</div>

			<section className="grid gap-4 rounded-xl border bg-card p-4">
				<h2 className="text-sm font-semibold">Site</h2>

				<div className="grid gap-3 sm:grid-cols-2">
					<label className="grid gap-1.5">
						<span className="text-sm font-medium">Site title</span>
						<input
							value={site.seo.title}
							onChange={(event) => updateSite({ seo: { ...site.seo, title: event.target.value } })}
							required
							className={inputClass}
						/>
					</label>

					<label className="grid gap-1.5">
						<span className="text-sm font-medium">Site owner</span>
						<input
							value={site.seo.siteOwner ?? ''}
							onChange={(event) =>
								updateSite({ seo: { ...site.seo, siteOwner: event.target.value } })
							}
							className={inputClass}
						/>
					</label>
				</div>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Description</span>
					<textarea
						value={site.seo.description}
						onChange={(event) =>
							updateSite({ seo: { ...site.seo, description: event.target.value } })
						}
						rows={2}
						className={inputClass}
					/>
				</label>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Logo</span>
					<input
						value={site.seo.logo ?? ''}
						onChange={(event) => updateSite({ seo: { ...site.seo, logo: event.target.value } })}
						placeholder="/favicon.svg"
						className={inputClass}
					/>
				</label>

				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={site.footerStarfield !== false}
						onChange={(event) => updateSite({ footerStarfield: event.target.checked })}
						className="size-4"
					/>
					<span>Footer starfield</span>
				</label>

				<div className="grid gap-2">
					<span className="text-sm font-medium">Navigation</span>
					{site.nav.map((item, index) => (
						<div key={index} className="flex flex-wrap gap-2">
							<input
								aria-label={`Nav item ${index + 1} title`}
								value={item.title}
								onChange={(event) => updateNav(index, { title: event.target.value })}
								placeholder="Title"
								className={`${inputClass} min-w-32 flex-1`}
							/>
							<input
								aria-label={`Nav item ${index + 1} link`}
								value={item.link}
								onChange={(event) => updateNav(index, { link: event.target.value })}
								placeholder="/projects"
								className={`${inputClass} min-w-32 flex-1`}
							/>
							<button
								type="button"
								onClick={() => updateSite({ nav: site.nav.filter((_, i) => i !== index) })}
								className="rounded border px-2 py-1 text-xs text-destructive"
							>
								Remove
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() => updateSite({ nav: [...site.nav, { title: '', link: '' }] })}
						className="w-fit rounded-md border px-3 py-1 text-sm"
					>
						Add nav item
					</button>
				</div>

				<div className="grid gap-2">
					<span className="text-sm font-medium">Contact links</span>
					{site.contactLinks.map((item, index) => (
						<div key={index} className="flex flex-wrap gap-2">
							<input
								aria-label={`Contact link ${index + 1} title`}
								value={item.title}
								onChange={(event) => updateContact(index, { title: event.target.value })}
								placeholder="GitHub"
								className={`${inputClass} min-w-24 flex-1`}
							/>
							<input
								aria-label={`Contact link ${index + 1} URL`}
								value={item.link}
								onChange={(event) => updateContact(index, { link: event.target.value })}
								placeholder="https://github.com/…"
								className={`${inputClass} min-w-32 flex-1`}
							/>
							<input
								aria-label={`Contact link ${index + 1} icon`}
								value={item.icon}
								onChange={(event) => updateContact(index, { icon: event.target.value })}
								placeholder="tabler:brand-github"
								className={`${inputClass} min-w-32 flex-1`}
							/>
							<button
								type="button"
								onClick={() =>
									updateSite({
										contactLinks: site.contactLinks.filter((_, i) => i !== index),
									})
								}
								className="rounded border px-2 py-1 text-xs text-destructive"
							>
								Remove
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() =>
							updateSite({
								contactLinks: [...site.contactLinks, { title: '', link: '', icon: '' }],
							})
						}
						className="w-fit rounded-md border px-3 py-1 text-sm"
					>
						Add contact link
					</button>
				</div>
			</section>

			<section className="grid gap-4 rounded-xl border bg-card p-4">
				<h2 className="text-sm font-semibold">Home</h2>

				<label className="grid gap-1.5">
					<span className="text-sm font-medium">Intro</span>
					<textarea
						value={intro}
						onChange={(event) => {
							setIntro(event.target.value);
							setSaved(false);
						}}
						rows={4}
						className={inputClass}
					/>
				</label>

				<div className="grid gap-2">
					<span className="text-sm font-medium">Featured projects</span>

					{featured.map((slug, index) => {
						const post = posts.find((item) => item.slug === slug);
						return (
							<div key={slug} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
								<span className="min-w-0 flex-1 truncate">
									{post?.title ?? slug}
									<span className="ml-2 text-xs text-muted-foreground">{slug}</span>
								</span>
								<button type="button" onClick={() => moveFeatured(index, -1)} className="rounded border px-2 py-1 text-xs">
									Up
								</button>
								<button type="button" onClick={() => moveFeatured(index, 1)} className="rounded border px-2 py-1 text-xs">
									Down
								</button>
								<button
									type="button"
									onClick={() => {
										setFeatured(featured.filter((_, i) => i !== index));
										setSaved(false);
									}}
									className="rounded border px-2 py-1 text-xs text-destructive"
								>
									Remove
								</button>
							</div>
						);
					})}

					<div className="flex flex-wrap gap-2">
						<select
							aria-label="Add featured project"
							value={toAdd}
							onChange={(event) => setToAdd(event.target.value)}
							className={inputClass}
						>
							<option value="">Choose a published post…</option>
							{available.map((post) => (
								<option key={post.slug} value={post.slug}>
									{post.title}
								</option>
							))}
						</select>
						<button
							type="button"
							disabled={!toAdd}
							onClick={() => {
								setFeatured([...featured, toAdd]);
								setToAdd('');
								setSaved(false);
							}}
							className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
						>
							Add
						</button>
					</div>
				</div>
			</section>

			<section className="grid gap-4 rounded-xl border bg-card p-4">
				<h2 className="text-sm font-semibold">About</h2>

				<div className="grid gap-2">
					<span className="text-sm font-medium">Portrait</span>
					{portrait ? (
						<>
							<img src={portrait} alt={portraitAlt} className="max-h-64 w-fit rounded-md border object-cover" />
							<input
								aria-label="Portrait alt text"
								value={portraitAlt}
								onChange={(event) => {
									setPortraitAlt(event.target.value);
									setSaved(false);
								}}
								placeholder="Portrait alt text"
								className={inputClass}
							/>
							<div className="flex gap-2 text-xs">
								<button type="button" onClick={() => portraitRef.current?.click()} className="rounded border px-2 py-1">
									Replace
								</button>
								<button
									type="button"
									onClick={() => {
										setPortrait('');
										setPortraitAlt('');
										setSaved(false);
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
							onClick={() => portraitRef.current?.click()}
							className="w-fit rounded-md border px-3 py-1.5 text-sm"
						>
							Add portrait
						</button>
					)}
					<input
						ref={portraitRef}
						type="file"
						accept="image/*"
						onChange={(event) => addPortrait(event.target.files)}
						className="hidden"
					/>
				</div>

				<div className="min-h-[30vh] rounded-md border p-3">
					<BlockNoteView editor={editor} theme={dark ? 'dark' : 'light'} />
				</div>
			</section>

			<div>
				<button
					type="submit"
					disabled={saving}
					className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save settings'}
				</button>
			</div>
		</form>
	);
}

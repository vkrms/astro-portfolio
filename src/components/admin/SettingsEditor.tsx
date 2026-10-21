import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@admin/components/ui/card';
import { Checkbox } from '@admin/components/ui/checkbox';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@admin/components/ui/select';
import { Textarea } from '@admin/components/ui/textarea';
import type { HomeSettings, SiteSettings } from '../../lib/schema';

interface PostOption {
	slug: string;
	title: string;
	draft: boolean;
}

interface Props {
	site: SiteSettings;
	home: HomeSettings;
	posts: PostOption[];
}

export default function SettingsEditor({ site: initialSite, home: initialHome, posts }: Props) {
	const [site, setSite] = useState(initialSite);
	const [home, setHome] = useState(initialHome);
	const [featured, setFeatured] = useState(initialHome.featured);
	const [toAdd, setToAdd] = useState('');
	const [saving, setSaving] = useState(false);

	const available = posts.filter((post) => !post.draft && !featured.includes(post.slug));

	function updateSite(patch: Partial<SiteSettings>) {
		setSite((current) => ({ ...current, ...patch }));
	}

	function updateHome(patch: Partial<HomeSettings>) {
		setHome((current) => ({ ...current, ...patch }));
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
	}

	async function save() {
		setSaving(true);

		try {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					site,
					home: { ...home, featured },
				}),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				toast.error(payload?.error ?? 'Could not save settings.');
				return;
			}

			toast.success('Saved.');
		} finally {
			setSaving(false);
		}
	}

	const saveButton = (
		<Button type="submit" disabled={saving}>
			{saving ? 'Saving…' : 'Save settings'}
		</Button>
	);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
			className="grid gap-6"
		>
			<div>{saveButton}</div>

			<Card className="gap-4 py-4">
				<CardHeader className="px-4">
					<CardTitle className="text-sm">Site</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 px-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="grid gap-1.5">
							<Label htmlFor="site-title">Site title</Label>
							<Input
								id="site-title"
								value={site.seo.title}
								onChange={(event) => updateSite({ seo: { ...site.seo, title: event.target.value } })}
								required
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="site-owner">Site owner</Label>
							<Input
								id="site-owner"
								value={site.seo.siteOwner ?? ''}
								onChange={(event) =>
									updateSite({ seo: { ...site.seo, siteOwner: event.target.value } })
								}
							/>
						</div>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="site-description">Description</Label>
						<Textarea
							id="site-description"
							value={site.seo.description}
							onChange={(event) =>
								updateSite({ seo: { ...site.seo, description: event.target.value } })
							}
							rows={2}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="site-logo">Logo</Label>
						<Input
							id="site-logo"
							value={site.seo.logo ?? ''}
							onChange={(event) => updateSite({ seo: { ...site.seo, logo: event.target.value } })}
							placeholder="/favicon.svg"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="footer-starfield"
							checked={site.footerStarfield !== false}
							onCheckedChange={(checked) => updateSite({ footerStarfield: checked === true })}
						/>
						<Label htmlFor="footer-starfield">Footer starfield</Label>
					</div>

					<div className="grid gap-2">
						<span className="text-sm font-medium">Navigation</span>
						{site.nav.map((item, index) => (
							<div key={index} className="flex flex-wrap gap-2">
								<Input
									aria-label={`Nav item ${index + 1} title`}
									value={item.title}
									onChange={(event) => updateNav(index, { title: event.target.value })}
									placeholder="Title"
									className="min-w-32 flex-1"
								/>
								<Input
									aria-label={`Nav item ${index + 1} link`}
									value={item.link}
									onChange={(event) => updateNav(index, { link: event.target.value })}
									placeholder="/#work"
									className="min-w-32 flex-1"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-destructive"
									onClick={() => updateSite({ nav: site.nav.filter((_, i) => i !== index) })}
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
							onClick={() => updateSite({ nav: [...site.nav, { title: '', link: '' }] })}
						>
							Add nav item
						</Button>
					</div>

					<div className="grid gap-2">
						<span className="text-sm font-medium">Contact links</span>
						{site.contactLinks.map((item, index) => (
							<div key={index} className="flex flex-wrap gap-2">
								<Input
									aria-label={`Contact link ${index + 1} title`}
									value={item.title}
									onChange={(event) => updateContact(index, { title: event.target.value })}
									placeholder="GitHub"
									className="min-w-24 flex-1"
								/>
								<Input
									aria-label={`Contact link ${index + 1} URL`}
									value={item.link}
									onChange={(event) => updateContact(index, { link: event.target.value })}
									placeholder="https://github.com/…"
									className="min-w-32 flex-1"
								/>
								<Input
									aria-label={`Contact link ${index + 1} icon`}
									value={item.icon}
									onChange={(event) => updateContact(index, { icon: event.target.value })}
									placeholder="tabler:brand-github"
									className="min-w-32 flex-1"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-destructive"
									onClick={() =>
										updateSite({
											contactLinks: site.contactLinks.filter((_, i) => i !== index),
										})
									}
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
							onClick={() =>
								updateSite({
									contactLinks: [...site.contactLinks, { title: '', link: '', icon: '' }],
								})
							}
						>
							Add contact link
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="gap-4 py-4">
				<CardHeader className="px-4">
					<CardTitle className="text-sm">Home</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 px-4">
					<div className="grid gap-1.5">
						<Label htmlFor="home-eyebrow">Eyebrow</Label>
						<Input
							id="home-eyebrow"
							value={home.eyebrow}
							onChange={(event) => updateHome({ eyebrow: event.target.value })}
							placeholder="Hey, I'm …"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="grid gap-1.5">
							<Label htmlFor="home-headline">Headline</Label>
							<Input
								id="home-headline"
								value={home.headline}
								onChange={(event) => updateHome({ headline: event.target.value })}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="home-highlight">Highlighted headline</Label>
							<Input
								id="home-highlight"
								value={home.highlight}
								onChange={(event) => updateHome({ highlight: event.target.value })}
							/>
						</div>
					</div>
					<p className="-mt-2 text-xs text-muted-foreground">
						The highlighted part follows the headline in the accent colour. Leave both empty to show the site
						title.
					</p>

					<div className="grid gap-1.5">
						<Label htmlFor="home-intro">Intro</Label>
						<Textarea
							id="home-intro"
							value={home.intro}
							onChange={(event) => updateHome({ intro: event.target.value })}
							rows={10}
						/>
						<span className="text-xs text-muted-foreground">Separate paragraphs with a blank line.</span>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="grid gap-1.5">
							<Label htmlFor="home-cta-label">Button label</Label>
							<Input
								id="home-cta-label"
								value={home.ctaLabel}
								onChange={(event) => updateHome({ ctaLabel: event.target.value })}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="home-cta-link">Button link</Label>
							<Input
								id="home-cta-link"
								value={home.ctaLink}
								onChange={(event) => updateHome({ ctaLink: event.target.value })}
								placeholder="#work, /projects or mailto:…"
							/>
						</div>
					</div>

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
									<Button type="button" variant="outline" size="sm" onClick={() => moveFeatured(index, -1)}>
										Up
									</Button>
									<Button type="button" variant="outline" size="sm" onClick={() => moveFeatured(index, 1)}>
										Down
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-destructive"
										onClick={() => setFeatured(featured.filter((_, i) => i !== index))}
									>
										Remove
									</Button>
								</div>
							);
						})}

						<div className="flex flex-wrap gap-2">
							<Select value={toAdd} onValueChange={setToAdd}>
								<SelectTrigger aria-label="Add featured project" className="min-w-64">
									<SelectValue placeholder="Choose a published post…" />
								</SelectTrigger>
								<SelectContent>
									{available.map((post) => (
										<SelectItem key={post.slug} value={post.slug}>
											{post.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								type="button"
								variant="outline"
								disabled={!toAdd}
								onClick={() => {
									setFeatured([...featured, toAdd]);
									setToAdd('');
								}}
							>
								Add
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<div>{saveButton}</div>
		</form>
	);
}

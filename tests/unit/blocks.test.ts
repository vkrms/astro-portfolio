import { describe, expect, it } from 'vitest';
import { findEmbedWithoutTitle, findImageWithoutAlt, normalizeBlocks } from '../../src/blocks/shared';

describe('findImageWithoutAlt', () => {
	it('finds an image block with empty alt text', () => {
		const blocks = [{ type: 'image', props: { src: '/uploads/a.jpg', alt: '' } }];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});

	it('ignores image blocks with alt text', () => {
		const blocks = [{ type: 'image', props: { src: '/uploads/a.jpg', alt: 'A photo' } }];
		expect(findImageWithoutAlt(blocks)).toBe(false);
	});

	it('ignores whitespace-only alt text as missing', () => {
		const blocks = [{ type: 'image', props: { src: '/uploads/a.jpg', alt: '   ' } }];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});

	it('checks nested children', () => {
		const blocks = [
			{
				type: 'bulletListItem',
				content: [],
				children: [{ type: 'image', props: { src: '/uploads/a.jpg', alt: '' } }],
			},
		];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});

	it('ignores non-image blocks', () => {
		const blocks = [{ type: 'paragraph', props: {}, content: [] }];
		expect(findImageWithoutAlt(blocks)).toBe(false);
	});

	it('checks carousel slide alt text', () => {
		const blocks = [
			{
				type: 'carousel',
				props: { items: JSON.stringify([{ src: '/uploads/a.jpg', alt: '' }]) },
			},
		];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});

	it('accepts carousel slides with alt text', () => {
		const blocks = [
			{
				type: 'carousel',
				props: { items: JSON.stringify([{ src: '/uploads/a.jpg', alt: 'A photo' }]) },
			},
		];
		expect(findImageWithoutAlt(blocks)).toBe(false);
	});

	it('checks gallery image alt text', () => {
		const blocks = [
			{
				type: 'gallery',
				props: { items: JSON.stringify([{ src: '/uploads/a.jpg', alt: ' ' }]) },
			},
		];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});

	it('checks media and text image alt text', () => {
		const blocks = [{ type: 'mediaText', props: { src: '/uploads/a.jpg', alt: '' } }];
		expect(findImageWithoutAlt(blocks)).toBe(true);
	});
});

describe('findEmbedWithoutTitle', () => {
	it('flags an embed with a URL and no title', () => {
		const blocks = [{ type: 'embed', props: { url: 'https://example.com', title: '' } }];
		expect(findEmbedWithoutTitle(blocks)).toBe(true);
	});

	it('accepts an embed with a title', () => {
		const blocks = [{ type: 'embed', props: { url: 'https://example.com', title: 'Demo' } }];
		expect(findEmbedWithoutTitle(blocks)).toBe(false);
	});

	it('ignores an empty embed', () => {
		const blocks = [{ type: 'embed', props: { url: '', title: '' } }];
		expect(findEmbedWithoutTitle(blocks)).toBe(false);
	});
});

describe('normalizeBlocks', () => {
	it('maps the legacy image url prop to src', () => {
		const blocks = [{ type: 'image', props: { url: 'https://example.com/a.jpg' } }];
		expect(normalizeBlocks(blocks)).toEqual([
			{
				type: 'image',
				props: { url: 'https://example.com/a.jpg', src: 'https://example.com/a.jpg', alt: '', caption: '' },
			},
		]);
	});

	it('keeps an existing src and fills missing alt and caption', () => {
		const blocks = [{ type: 'image', props: { src: '/uploads/a.jpg', alt: 'A photo' } }];
		expect(normalizeBlocks(blocks)).toEqual([
			{ type: 'image', props: { src: '/uploads/a.jpg', alt: 'A photo', caption: '' } },
		]);
	});

	it('leaves other blocks untouched', () => {
		const block = { type: 'paragraph', props: { textAlignment: 'left' }, content: [] };
		expect(normalizeBlocks([block])).toEqual([block]);
	});

	it('normalizes nested children', () => {
		const blocks = [
			{ type: 'bulletListItem', content: [], children: [{ type: 'image', props: { alt: '' } }] },
		];
		expect(normalizeBlocks(blocks)).toEqual([
			{
				type: 'bulletListItem',
				content: [],
				children: [{ type: 'image', props: { src: '', alt: '', caption: '' } }],
			},
		]);
	});
});

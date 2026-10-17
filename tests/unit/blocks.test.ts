import { describe, expect, it } from 'vitest';
import { findImageWithoutAlt, normalizeBlocks } from '../../src/blocks/shared';

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

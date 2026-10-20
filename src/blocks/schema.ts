import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { CarouselBlock } from './CarouselBlock';
import { EmbedBlock } from './EmbedBlock';
import { GalleryBlock } from './GalleryBlock';
import { ImageBlock } from './ImageBlock';
import { MediaTextBlock } from './MediaTextBlock';
import { QuoteBlock } from './QuoteBlock';

const createCarousel = createReactBlockSpec(
	{
		type: 'carousel',
		propSchema: {
			items: { default: '[]' },
			aspect: { default: '16/9' },
		},
		content: 'none',
	},
	{ render: CarouselBlock },
);

const createImage = createReactBlockSpec(
	{
		type: 'image',
		propSchema: {
			src: { default: '' },
			alt: { default: '' },
			caption: { default: '' },
			width: { default: 'wide' },
		},
		content: 'none',
	},
	{ render: ImageBlock },
);

const createGallery = createReactBlockSpec(
	{
		type: 'gallery',
		propSchema: {
			items: { default: '[]' },
			columns: { default: '3' },
		},
		content: 'none',
	},
	{ render: GalleryBlock },
);

const createEmbed = createReactBlockSpec(
	{
		type: 'embed',
		propSchema: {
			url: { default: '' },
			title: { default: '' },
			aspect: { default: '16/9' },
		},
		content: 'none',
	},
	{ render: EmbedBlock },
);

const createQuote = createReactBlockSpec(
	{
		type: 'quote',
		propSchema: {
			attribution: { default: '' },
		},
		content: 'inline',
	},
	{ render: QuoteBlock },
);

const createMediaText = createReactBlockSpec(
	{
		type: 'mediaText',
		propSchema: {
			src: { default: '' },
			alt: { default: '' },
			side: { default: 'left' },
		},
		content: 'inline',
	},
	{ render: MediaTextBlock },
);

export const schema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		image: createImage(),
		carousel: createCarousel(),
		gallery: createGallery(),
		embed: createEmbed(),
		quote: createQuote(),
		mediaText: createMediaText(),
	},
});

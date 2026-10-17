import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { CarouselBlock } from './CarouselBlock';
import { ImageBlock } from './ImageBlock';

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
		},
		content: 'none',
	},
	{ render: ImageBlock },
);

export const schema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		image: createImage(),
		carousel: createCarousel(),
	},
});

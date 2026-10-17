import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { CarouselBlock } from './CarouselBlock';

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

export const schema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		carousel: createCarousel(),
	},
});

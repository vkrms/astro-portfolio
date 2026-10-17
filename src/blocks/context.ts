import { createContext } from 'react';

/** Current post slug, used by the media picker to choose the upload folder. */
export const SlugContext = createContext('draft');

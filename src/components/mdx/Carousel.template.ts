import type { Template } from "tinacms";

export const carouselTemplate: Template = {
  name: "Carousel",
  label: "Carousel",
  fields: [
    {
      name: "slides",
      label: "Slides",
      type: "object",
      list: true,
      required: true,
      ui: {
        itemProps: (item) => ({ label: item?.caption || item?.alt || "Slide" }),
      },
      fields: [
        { name: "image", label: "Image", type: "image", required: true },
        { name: "alt", label: "Alt text", type: "string", required: true },
        { name: "caption", label: "Caption", type: "string" },
      ],
    },
    {
      name: "aspect",
      label: "Aspect ratio",
      type: "string",
      options: [
        { value: "16/9", label: "16:9" },
        { value: "3/2", label: "3:2" },
        { value: "4/3", label: "4:3" },
        { value: "1/1", label: "Square" },
      ],
    },
  ],
};

# ArtifactPreview

A component that renders previews of brainstorm artifacts (generated files) in different formats based on the artifact's MIME type.

## Key Features

- **Image Preview**: Displays PNG images with a shine border effect
- **Video Preview**: Displays MP4 videos with a purple-themed shine border
- **Markdown Rendering**: Renders text/markdown content with styled typography
- **Shine Border Effect**: Adds animated shine effects to image and video previews

## Props

| Prop | Type | Description |
|------|------|-------------|
| `artifact` | `BrainstormArtifact` | The artifact object containing content and metadata |

## Artifact Types

### Image (image/png)
- Renders image from base64 content
- Applies amber-themed shine border
- Displays label if present

### Video (video/mp4)
- Renders video player with controls
- Applies purple-themed shine border
- Displays label if present

### Markdown/Text (default)
- Uses `react-markdown` for rendering
- Styled with `prose` classes for dark theme
- Supports headings, paragraphs, links, code blocks, lists, blockquotes

## Dependencies

- `react-markdown` for markdown content rendering
- `ShineBorder` component for visual effects
- `BrainstormArtifact` type from `useGeminiBrainstorm` hook

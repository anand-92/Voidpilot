# WorkspacePanel

A comprehensive component for managing brainstorm artifacts (generated files). Displays a list of artifacts with preview capabilities and download functionality.

## Key Features

- **Artifact List**: Displays all generated artifacts in a scrollable list
- **Artifact Preview**: Shows detailed preview of selected artifact
- **Download Options**: Download individual artifacts or all as a ZIP archive
- **Empty State**: Styled placeholder when no artifacts exist
- **Mobile Support**: Different layout for mobile vs desktop viewports
- **Activity Indicator**: Shows loading spinner when generating content

## Props

| Prop | Type | Description |
|------|------|-------------|
| `artifacts` | `Map<string, BrainstormArtifact>` | Map of filename to artifact data |
| `artifactList` | `Array<[string, BrainstormArtifact]>` | Array form for iteration |
| `totalSize` | `number` | Total size of all artifacts in bytes |
| `isGenerating` | `boolean` | Whether content is being generated |
| `selectedArtifact` | `string | null` | Currently selected artifact filename |
| `currentArtifact` | `BrainstormArtifact | null` | Full artifact object for preview |
| `setSelectedArtifact` | `Dispatch<SetStateAction<string | null>>` | Callback to select artifact |
| `mobile` | `boolean` | Whether to render mobile layout |

## Desktop Layout Features

- **Two-column layout**: Artifact list on left, preview on right
- **MagicCard styling**: Artifacts displayed in styled cards with gradient borders
- **Archive download**: Button to download all artifacts as ZIP
- **Animated transitions**: Smooth fade and slide animations

## Mobile Layout Features

- **Single column**: Stacked list with inline preview
- **Column layout**: Uses CSS columns for 2-column grid of artifacts
- **Integrated preview**: Preview appears below artifact list

## Artifact Row

Uses `ArtifactRow` component for individual artifact display with:
- Filename and type icon
- File size badge
- Selection state styling
- Download button

## Empty State

Displays when `artifactList.length === 0`:
- Gemini star icon
- "Your Canvas is Empty" / "No artifacts yet" message
- Helpful description text

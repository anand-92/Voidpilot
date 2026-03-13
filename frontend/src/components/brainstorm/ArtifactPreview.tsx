import ReactMarkdown from 'react-markdown'
import { ShineBorder } from '@/components/ui/shine-border'
import type { BrainstormArtifact } from '../../hooks/useGeminiBrainstorm'

export function ArtifactPreview({ artifact }: { artifact: BrainstormArtifact }) {
  if (artifact.content === null) {
    return null
  }

  if (artifact.mimeType === 'image/png') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-stone-950/60 p-2">
        <ShineBorder
          shineColor={['#d97706', '#fbbf24', '#92400e']}
          borderWidth={1}
          duration={12}
        />
        <img
          src={`data:image/png;base64,${artifact.content}`}
          alt={artifact.label ?? artifact.filename}
          className="max-h-80 w-full rounded-lg object-contain"
        />
        {artifact.label && <p className="mt-2 text-center text-xs text-stone-500">{artifact.label}</p>}
        {/* Show interleaved text if available */}
        {artifact.text && (
          <div className="mt-4 rounded-lg border border-white/[0.06] bg-stone-900/50 p-3">
            <div className="prose prose-invert prose-xs max-w-none prose-headings:text-stone-300 prose-p:text-stone-400">
              <ReactMarkdown>{artifact.text}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (artifact.mimeType === 'video/mp4') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-stone-950/60 p-2">
        <ShineBorder
          shineColor={['#9333ea', '#a855f7', '#7c3aed']}
          borderWidth={1}
          duration={12}
        />
        <video
          src={`data:video/mp4;base64,${artifact.content}`}
          controls
          className="max-h-80 w-full rounded-lg"
        />
        {artifact.label && <p className="mt-2 text-center text-xs text-stone-500">{artifact.label}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-stone-950/40 p-4">
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-stone-200 prose-p:text-stone-400 prose-a:text-amber-400 prose-strong:text-stone-200 prose-code:rounded prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-amber-300 prose-pre:border prose-pre:border-white/[0.06] prose-pre:bg-stone-950 prose-li:text-stone-400 prose-blockquote:border-amber-500/30 prose-blockquote:text-stone-500">
        <ReactMarkdown>{artifact.content}</ReactMarkdown>
      </div>
    </div>
  )
}

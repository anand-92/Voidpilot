import { useState, useEffect, useMemo, useCallback } from 'react'
import type { DesktopCapturerSource, RegionBounds } from '../electron-env'

export type ShareMode = 'full' | 'region'

export function useScreenSharing() {
  const [screenShareEnabled, setScreenShareEnabled] = useState(false)
  const [sources, setSources] = useState<DesktopCapturerSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>('full')
  const [selectedRegion, setSelectedRegion] = useState<RegionBounds | null>(null)
  const [isPickingRegion, setIsPickingRegion] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [showDisplayPicker, setShowDisplayPicker] = useState(false)

  useEffect(() => {
    if (!screenShareEnabled) {
      setSources([])
      setSelectedSourceId('')
      setIsLoadingSources(true)
      setSetupError(null)
      return
    }

    let isMounted = true

    async function loadSources() {
      if (!window.electronAPI?.getDesktopSources) {
        setSetupError('Electron desktop source API is unavailable.')
        setIsLoadingSources(false)
        return
      }

      try {
        const availableSources = await window.electronAPI.getDesktopSources()
        if (!isMounted) return

        setSources(availableSources)
        const defaultSource = availableSources.find((source) => source.isPrimary) ?? availableSources[0]
        if (defaultSource) {
          setSelectedSourceId(defaultSource.id)
        }
      } catch (error) {
        if (!isMounted) return
        setSetupError((error as Error).message)
      } finally {
        if (isMounted) {
          setIsLoadingSources(false)
        }
      }
    }

    loadSources()
    return () => {
      isMounted = false
    }
  }, [screenShareEnabled])

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  )

  useEffect(() => {
    setSelectedRegion(null)
  }, [selectedSourceId, shareMode])

  const handlePickRegion = useCallback(async () => {
    if (!selectedSource || !window.electronAPI?.openRegionSelector) return

    setSetupError(null)
    setIsPickingRegion(true)
    try {
      const result = await window.electronAPI.openRegionSelector(selectedSource)
      if (result) {
        setSelectedRegion(result.region)
      }
    } catch (error) {
      setSetupError((error as Error).message)
    } finally {
      setIsPickingRegion(false)
    }
  }, [selectedSource])

  const validateBeforeStart = useCallback(() => {
    if (screenShareEnabled) {
      if (!selectedSource || !window.electronAPI?.setMidsceneDisplay) return false
      if (shareMode === 'region' && !selectedRegion) {
        setSetupError('Choose a region before starting a partial display share.')
        return false
      }
    }
    return true
  }, [screenShareEnabled, selectedSource, shareMode, selectedRegion])

  return {
    screenShareEnabled,
    setScreenShareEnabled,
    sources,
    selectedSourceId,
    setSelectedSourceId,
    shareMode,
    setShareMode,
    selectedRegion,
    isPickingRegion,
    isLoadingSources,
    setupError,
    setSetupError,
    showDisplayPicker,
    setShowDisplayPicker,
    selectedSource,
    handlePickRegion,
    validateBeforeStart,
  }
}

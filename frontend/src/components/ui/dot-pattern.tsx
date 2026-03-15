"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface DotPatternProps {
  width?: number
  height?: number
  x?: number
  y?: number
  cx?: number
  cy?: number
  cr?: number
  className?: string
  glow?: boolean
}

export function DotPattern({
  className,
}: DotPatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setSize = () => {
      if (!canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
    }
    
    setSize()
    window.addEventListener("resize", setSize)

    // Increase star count for a more galaxy-like feel
    const starCount = 350
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * (canvas.parentElement?.clientWidth || window.innerWidth),
      y: Math.random() * (canvas.parentElement?.clientHeight || window.innerHeight),
      radius: Math.random() > 0.85 ? Math.random() * 2 + 1 : Math.random() * 1.2 + 0.3,
      alpha: Math.random(),
      velocity: (Math.random() * 0.003) + 0.001, // Much slower and relaxing twinkle speed
      direction: Math.random() > 0.5 ? 1 : -1,
      minAlpha: Math.random() * 0.2, // Trough
      maxAlpha: Math.random() * 0.5 + 0.5, // Peak
      color: Math.random() > 0.7 ? "219, 234, 254" : "147, 197, 253" // blue-100 or blue-300
    }))

    let animationFrameId: number

    const render = () => {
      // Create a dark space-like background clear
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      stars.forEach(star => {
        // Smooth Twinkle effect
        star.alpha += star.velocity * star.direction
        if (star.alpha >= star.maxAlpha) {
          star.alpha = star.maxAlpha
          star.direction = -1
        } else if (star.alpha <= star.minAlpha) {
          star.alpha = star.minAlpha
          star.direction = 1
        }

        // Add glow effect
        ctx.shadowBlur = star.radius * 6
        ctx.shadowColor = `rgba(${star.color}, ${star.alpha * 1.5})`

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${star.color}, ${star.alpha})`
        ctx.fill()

        // Draw inner bright core for larger stars
        if (star.radius > 1.5) {
          ctx.shadowBlur = 0 // Disable shadow for inner core
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius * 0.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, star.alpha + 0.3)})`
          ctx.fill()
        }
      })
      
      // Reset shadow blur to avoid accumulating performance penalty
      ctx.shadowBlur = 0

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("resize", setSize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 h-full w-full",
        className
      )}
    />
  )
}

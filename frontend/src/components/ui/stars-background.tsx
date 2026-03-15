import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface StarsBackgroundProps {
  className?: string
  starCount?: number
}

export function StarsBackground({ className, starCount = 150 }: StarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Simple resize handler
    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()
    window.addEventListener("resize", setSize)

    // Generate stars
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.5,
      alpha: Math.random(),
      velocity: (Math.random() * 0.5) + 0.1, // Twinkle speed
      direction: Math.random() > 0.5 ? 1 : -1
    }))

    let animationFrameId: number

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      stars.forEach(star => {
        // Twinkle effect
        star.alpha += star.velocity * star.direction * 0.05
        if (star.alpha >= 1) {
          star.alpha = 1
          star.direction = -1
        } else if (star.alpha <= 0.1) {
          star.alpha = 0.1
          star.direction = 1
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(147, 197, 253, ${star.alpha})` // blue-200/300ish color
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("resize", setSize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [starCount])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 z-0 pointer-events-none w-full h-full", className)}
    />
  )
}

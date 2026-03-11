"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type RollerItem = {
  text: string;
  className?: string;
};

export const voidpilotHeroItems: RollerItem[] = [
  { text: "sees your screen.", className: "text-cyan-300" },
  { text: "hears your voice.", className: "text-amber-300" },
  { text: "takes the wheel.", className: "text-sky-300" },
  { text: "guides your work.", className: "text-violet-300" },
  { text: "shapes ideas live.", className: "text-emerald-300" },
  { text: "spins up visuals.", className: "text-rose-300" },
];

type AnimatedTextRollerProps = {
  prefix?: string;
  items?: RollerItem[];
  className?: string;
  prefixClassName?: string;
  itemClassName?: string;
  intervalMs?: number;
};

const AnimatedTextRoller = ({
  prefix = "AI that",
  items = voidpilotHeroItems,
  className,
  prefixClassName,
  itemClassName,
  intervalMs = 2200,
}: AnimatedTextRollerProps) => {
  const [index, setIndex] = useState(0);
  const [activeWidth, setActiveWidth] = useState<number>();
  const [activeHeight, setActiveHeight] = useState<number>();
  const [isReady, setIsReady] = useState(false);
  const itemRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const normalizedItems = useMemo(() => {
    if (items.length > 0) {
      return items;
    }

    return [{ text: "", className: undefined } satisfies RollerItem];
  }, [items]);

  useEffect(() => {
    document.fonts?.ready.then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (normalizedItems.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % normalizedItems.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, normalizedItems.length]);

  useEffect(() => {
    setIndex((prev) => (prev >= normalizedItems.length ? 0 : prev));
  }, [normalizedItems.length]);

  useLayoutEffect(() => {
    const updateMeasurements = () => {
      const currentItem = itemRefs.current[index];
      if (!currentItem) {
        return;
      }

      const { width, height } = currentItem.getBoundingClientRect();
      setActiveWidth(Math.ceil(width) + 28);
      setActiveHeight(height);
    };

    updateMeasurements();

    if (typeof window === "undefined") {
      return;
    }

    document.fonts?.ready.then(() => {
      updateMeasurements();
    });

    window.addEventListener("resize", updateMeasurements);

    return () => window.removeEventListener("resize", updateMeasurements);
  }, [index, normalizedItems, itemClassName]);

  const translateY = itemRefs.current
    .slice(0, index)
    .reduce((total, item) => total + (item?.getBoundingClientRect().height ?? activeHeight ?? 0), 0);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 transition-opacity duration-500",
        isReady ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <p className={cn("text-white", prefixClassName)}>{prefix}</p>
      <div
        className="overflow-hidden text-center transition-[width,height] duration-500 ease-in-out"
        style={{
          width: activeWidth ? `${activeWidth}px` : undefined,
          height: activeHeight ? `${activeHeight}px` : undefined,
        }}
      >
        <div
          className="transition-transform duration-700 ease-in-out will-change-transform"
          style={{ transform: `translateY(-${translateY}px)` }}
        >
          {normalizedItems.map((item) => (
            <p
              key={item.text}
              className={cn(
                "flex items-center justify-start whitespace-nowrap font-semibold tracking-tight",
                itemClassName,
                item.className,
              )}
            >
              {item.text}
            </p>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -z-10 overflow-hidden opacity-0" aria-hidden="true">
        {normalizedItems.map((item, itemIndex) => (
          <p
            key={`${item.text}-measure`}
            ref={(node) => {
              itemRefs.current[itemIndex] = node;
            }}
            className={cn(
              "w-max whitespace-nowrap font-semibold tracking-tight",
              itemClassName,
              item.className,
            )}
          >
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default AnimatedTextRoller;

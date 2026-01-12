import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Caption } from "../lib/types";

interface CaptionOverlayProps {
  captions: Caption[];
  currentTime: number;
  onTokenClick: (token: string, caption: Caption) => void;
  tokens: string[];
  selectedWords: Set<string>;
}

export function CaptionOverlay({
  captions,
  currentTime,
  onTokenClick,
  tokens,
  selectedWords,
}: CaptionOverlayProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Find current caption or create a dummy one for tokens
  const currentCaption = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  ) || { text: tokens.join(' '), start: currentTime, end: currentTime + 3 };

  if (tokens.length === 0) {
    return null;
  }

  const handleTokenClick = (e: React.MouseEvent, token: string) => {
    e.preventDefault();
    e.stopPropagation();
    onTokenClick(token, currentCaption);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.9)",
        padding: "16px 24px",
        borderRadius: "12px",
        fontSize: "28px",
        color: "white",
        fontWeight: "600",
        maxWidth: "85%",
        textAlign: "center",
        zIndex: 9999,
        pointerEvents: "auto",
        lineHeight: "1.8",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        userSelect: "none",
        cursor: "default",
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {tokens.map((token, index) => {
        const isSelected = selectedWords.has(token);
        const isHovered = hoveredIndex === index;
        
        return (
          <span
            key={index}
            onClick={(e) => handleTokenClick(e, token)}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              display: "inline-block",
              margin: "2px 3px",
              transition: "all 0.2s ease",
              background: isSelected
                ? "rgba(34, 197, 94, 0.7)"
                : isHovered
                ? "rgba(59, 130, 246, 0.7)"
                : "transparent",
              border: isSelected
                ? "2px solid rgba(34, 197, 94, 1)"
                : isHovered
                ? "2px solid rgba(96, 165, 250, 1)"
                : "2px solid transparent",
              transform: isHovered || isSelected ? "scale(1.1)" : "scale(1)",
              boxShadow: isSelected
                ? "0 0 10px rgba(34, 197, 94, 0.8)"
                : isHovered
                ? "0 0 10px rgba(59, 130, 246, 0.8)"
                : "none",
            }}
            title={isSelected ? "Click to deselect" : "Click to select and see definition"}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
}

export function createCaptionOverlay(
  container: HTMLElement,
  props: CaptionOverlayProps
) {
  const root = createRoot(container);
  root.render(<CaptionOverlay {...props} />);
  return root;
}

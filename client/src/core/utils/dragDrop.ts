import React from "react";

export function createDragHandlers(
  setIsDragging: (isDragging: boolean) => void,
  canAccept: boolean
) {
  return {
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (canAccept) {
        setIsDragging(true);
      }
    },
    handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (canAccept) {
        setIsDragging(true);
      }
    },
    handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
  };
}

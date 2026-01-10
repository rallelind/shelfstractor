import { useEffect, useRef } from "react";
import { useAnalyzerStore } from "../../stores/analyzer";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { BookCard } from "./BookCard";

export function BookViewer() {
  const dotRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const {
    imageBase64,
    books,
    currentBookIndex,
    status,
    extractedCount,
    nextBook,
    prevBook,
  } = useAnalyzerStore();

  const currentBook = books[currentBookIndex];
  const totalBooks = books.length;

  // Scroll the selected dot into view when navigation changes
  useEffect(() => {
    const dot = dotRefs.current.get(currentBookIndex);
    if (dot) {
      dot.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentBookIndex]);

  if (!imageBase64 || books.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-stone-400 text-sm font-ui">
          Book {currentBookIndex + 1} of {totalBooks}
        </span>
        {status === "extracting" && (
          <span className="flex items-center gap-1.5 text-stone-300 text-sm font-ui">
            Extracting {extractedCount}/{totalBooks}
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        )}
        {status === "complete" && (
          <span className="text-stone-300 text-sm font-ui">
            All books extracted
          </span>
        )}
      </div>

      {/* Image with bounding box */}
      <div className="relative px-2 py-3">
        <img
          src={imageBase64}
          alt="Bookshelf"
          className="w-full rounded-lg"
        />

        {/* Bounding box overlays */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ left: "0.5rem", right: "0.5rem", top: "0.75rem", bottom: "0.75rem", width: "calc(100% - 1rem)", height: "calc(100% - 1.5rem)" }}
        >
          {books.map((book, index) => {
            const isSelected = index === currentBookIndex;
            return (
              <rect
                key={book.id}
                x={`${book.boundingBox.x}%`}
                y={`${book.boundingBox.y}%`}
                width={`${book.boundingBox.width}%`}
                height={`${book.boundingBox.height}%`}
                rx="4"
                ry="4"
                fill="transparent"
                stroke={isSelected ? "#fafaf9" : "transparent"}
                strokeWidth={2}
                className="cursor-pointer"
                onClick={() => useAnalyzerStore.getState().setCurrentBook(index)}
              />
            );
          })}
        </svg>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={prevBook}
          disabled={currentBookIndex === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-stone-700 text-stone-300 font-ui text-sm hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[40%] px-2 scrollbar-none">
          {books.map((book, index) => (
            <button
              key={book.id}
              ref={(el) => {
                if (el) {
                  dotRefs.current.set(index, el);
                } else {
                  dotRefs.current.delete(index);
                }
              }}
              type="button"
              onClick={() => useAnalyzerStore.getState().setCurrentBook(index)}
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                index === currentBookIndex
                  ? "bg-stone-50 w-4"
                  : book.status === "pending"
                    ? "bg-stone-600"
                    : "bg-stone-400"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={nextBook}
          disabled={currentBookIndex === totalBooks - 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-stone-700 text-stone-300 font-ui text-sm hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Book card */}
      {currentBook && <BookCard book={currentBook} />}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useAnalyzerStore } from "../../stores/analyzer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCard } from "./BookCard";
import { Button, Spinner } from "../ui";

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

  useEffect(() => {
    const dot = dotRefs.current.get(currentBookIndex);
    if (dot) {
      dot.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentBookIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevBook();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextBook();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextBook, prevBook]);

  if (!imageBase64 || books.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-stone-400 text-sm font-ui">
          Book {currentBookIndex + 1} of {totalBooks}
        </span>
        {status === "extracting" && (
          <span className="flex items-center gap-1.5 text-stone-300 text-sm font-ui">
            Extracting {extractedCount}/{totalBooks}
            <Spinner size="sm" />
          </span>
        )}
        {status === "complete" && (
          <span className="text-stone-300 text-sm font-ui">
            All books extracted
          </span>
        )}
      </div>

      <div className="relative px-2 py-3">
        <img
          src={imageBase64}
          alt="Bookshelf"
          className="w-full rounded-lg"
        />

        <svg
          className="absolute inset-0 w-full h-full"
          style={{ left: "0.5rem", right: "0.5rem", top: "0.75rem", bottom: "0.75rem", width: "calc(100% - 1rem)", height: "calc(100% - 1.5rem)" }}
        >
          {books.map((book, index) => {
            if (index === currentBookIndex) return null;
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
                stroke="transparent"
                strokeWidth={2}
                className="cursor-pointer"
                onClick={() => useAnalyzerStore.getState().setCurrentBook(index)}
              />
            );
          })}
          {currentBook && (
            <rect
              x={`${currentBook.boundingBox.x}%`}
              y={`${currentBook.boundingBox.y}%`}
              width={`${currentBook.boundingBox.width}%`}
              height={`${currentBook.boundingBox.height}%`}
              rx="4"
              ry="4"
              fill="transparent"
              stroke="#fafaf9"
              strokeWidth={2}
              className="pointer-events-none"
              style={{
                transition: "x 300ms cubic-bezier(0.4, 0, 0.2, 1), y 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1), height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          rounded="lg"
          size="sm"
          onClick={prevBook}
          disabled={currentBookIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

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

        <Button
          variant="ghost"
          rounded="lg"
          size="sm"
          onClick={nextBook}
          disabled={currentBookIndex === totalBooks - 1}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {currentBook && <BookCard book={currentBook} />}
    </div>
  );
}

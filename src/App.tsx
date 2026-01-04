import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageUpload } from "./components/ImageUpload";
import { BookshelfViewer } from "./components/BookshelfViewer";
import { BookCard } from "./components/BookCard";
import type { AnalyzeResponse } from "./api";
import "./index.css";

async function analyzeImage(imageBase64: string): Promise<AnalyzeResponse> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze image");
  }

  return response.json();
}

export function App() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [hoveredBook, setHoveredBook] = useState<number | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: analyzeImage,
  });

  const handleImageSelected = (base64: string) => {
    setImageBase64(base64);
    analyzeMutation.mutate(base64);
  };

  const handleReset = () => {
    setImageBase64(null);
    setHoveredBook(null);
    analyzeMutation.reset();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Shelfstractor</h1>
        <p className="subtitle">Extract books from your bookshelf photos</p>
      </header>

      {!imageBase64 ? (
        <ImageUpload
          onImageSelected={handleImageSelected}
          disabled={analyzeMutation.isPending}
        />
      ) : (
        <div className="results-layout">
          <div className="viewer-section">
            <BookshelfViewer
              imageUrl={imageBase64}
              books={analyzeMutation.data?.books ?? []}
              hoveredBook={hoveredBook}
              onBookHover={setHoveredBook}
            />
            <button className="reset-button" onClick={handleReset}>
              Upload New Image
            </button>
          </div>

          <div className="results-section">
            <div className="results-header">
              <h2>Detected Books</h2>
              {analyzeMutation.isPending && (
                <span className="status-badge processing">Processing...</span>
              )}
              {analyzeMutation.isSuccess && (
                <span className="status-badge success">
                  {analyzeMutation.data.books.length} books found
                </span>
              )}
              {analyzeMutation.isError && (
                <span className="status-badge error">Error</span>
              )}
            </div>

            {analyzeMutation.isPending && (
              <div className="loading-state">
                <div className="spinner" />
                <p>Detecting books and extracting information...</p>
                <p className="loading-hint">This may take a moment</p>
              </div>
            )}

            {analyzeMutation.isError && (
              <div className="error-state">
                <p>Failed to analyze image</p>
                <p className="error-detail">
                  {analyzeMutation.error.message}
                </p>
                <button onClick={() => imageBase64 && analyzeMutation.mutate(imageBase64)}>
                  Retry
                </button>
              </div>
            )}

            {analyzeMutation.isSuccess && (
              <div className="books-list">
                {analyzeMutation.data.books.length === 0 ? (
                  <p className="no-books">No books detected in this image</p>
                ) : (
                  analyzeMutation.data.books.map((book, index) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      index={index}
                      isHovered={hoveredBook === index}
                      onHover={setHoveredBook}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

interface Book {
  id: string;
  title: string | null;
  author: string | null;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectionConfidence: number;
}

interface BookCardProps {
  book: Book;
  index: number;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}

export function BookCard({ book, index, isHovered, onHover }: BookCardProps) {
  const confidenceColor =
    book.confidence > 0.8
      ? "var(--color-success)"
      : book.confidence > 0.5
        ? "var(--color-warning)"
        : "var(--color-error)";

  return (
    <div
      className={`book-card ${isHovered ? "hovered" : ""}`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="book-number">{index + 1}</div>
      <div className="book-info">
        <h3 className="book-title">{book.title ?? "Unknown Title"}</h3>
        <p className="book-author">{book.author ?? "Unknown Author"}</p>
        <div className="book-confidence">
          <span
            className="confidence-dot"
            style={{ backgroundColor: confidenceColor }}
          />
          <span className="confidence-text">
            {Math.round(book.confidence * 100)}% confident
          </span>
        </div>
      </div>
    </div>
  );
}


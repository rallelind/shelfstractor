interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Book {
  id: string;
  title: string | null;
  author: string | null;
  confidence: number;
  boundingBox: BoundingBox;
  detectionConfidence: number;
}

interface BookshelfViewerProps {
  imageUrl: string;
  books: Book[];
  hoveredBook: number | null;
  onBookHover: (index: number | null) => void;
}

export function BookshelfViewer({
  imageUrl,
  books,
  hoveredBook,
  onBookHover,
}: BookshelfViewerProps) {
  return (
    <div className="bookshelf-viewer">
      <div className="image-container">
        <img src={imageUrl} alt="Bookshelf" className="bookshelf-image" />
        <svg className="bounding-boxes" viewBox="0 0 100 100" preserveAspectRatio="none">
          {books.map((book, index) => (
            <g
              key={book.id}
              onMouseEnter={() => onBookHover(index)}
              onMouseLeave={() => onBookHover(null)}
            >
              <rect
                x={book.boundingBox.x}
                y={book.boundingBox.y}
                width={book.boundingBox.width}
                height={book.boundingBox.height}
                className={`bounding-box ${hoveredBook === index ? "hovered" : ""}`}
              />
              <text
                x={book.boundingBox.x + book.boundingBox.width / 2}
                y={book.boundingBox.y - 1}
                className="box-label"
              >
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}


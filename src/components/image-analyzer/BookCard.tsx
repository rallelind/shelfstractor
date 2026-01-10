import { useState, useEffect } from "react";
import { useAnalyzerStore, type Book } from "../../stores/analyzer";
import { Check, Pencil, Loader2 } from "lucide-react";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const { updateBook, acceptBook } = useAnalyzerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title ?? "");
  const [editAuthor, setEditAuthor] = useState(book.author ?? "");

  // Update local state when book changes
  useEffect(() => {
    setEditTitle(book.title ?? "");
    setEditAuthor(book.author ?? "");
    setIsEditing(false);
  }, [book.id, book.title, book.author]);

  const isPending = book.status === "pending";
  const isAccepted = book.status === "accepted";

  const handleSave = () => {
    updateBook(book.id, {
      title: editTitle || null,
      author: editAuthor || null,
    });
    setIsEditing(false);
  };

  const handleAccept = () => {
    acceptBook(book.id);
  };

  if (isPending) {
    return (
      <div className="px-4 py-6 border-t border-stone-700 bg-stone-800/50">
        <div className="flex items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-ui text-sm">Extracting book info...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-t border-stone-700 bg-stone-800/50">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-stone-500 text-xs font-ui mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 font-ui text-sm focus:outline-none focus:ring-2 focus:ring-stone-400/50"
              placeholder="Enter title..."
            />
          </div>
          <div>
            <label className="block text-stone-500 text-xs font-ui mb-1">
              Author
            </label>
            <input
              type="text"
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 font-ui text-sm focus:outline-none focus:ring-2 focus:ring-stone-400/50"
              placeholder="Enter author..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2 rounded-lg border border-stone-600 text-stone-400 font-ui text-sm hover:bg-stone-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-900 font-ui text-sm font-medium hover:bg-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="block text-stone-500 text-xs font-ui">Title</span>
            <span className="block text-stone-100 font-display text-lg">
              {book.title ?? (
                <span className="text-stone-500 italic">Unknown</span>
              )}
            </span>
          </div>
          <div>
            <span className="block text-stone-500 text-xs font-ui">Author</span>
            <span className="block text-stone-300 font-ui">
              {book.author ?? (
                <span className="text-stone-500 italic">Unknown</span>
              )}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg border border-stone-600 text-stone-300 font-ui text-sm hover:bg-stone-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            {!isAccepted ? (
              <button
                type="button"
                onClick={handleAccept}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg bg-stone-100 text-stone-900 font-ui text-sm font-medium hover:bg-white transition-colors"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-lg bg-stone-700 text-stone-300 font-ui text-sm">
                <Check className="w-4 h-4" />
                Accepted
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


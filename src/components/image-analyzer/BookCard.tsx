import { useState, useEffect } from "react";
import { useAnalyzerStore, type Book } from "../../stores/analyzer";
import { Check, Pencil, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Button, Input, Label, Spinner } from "../ui";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const { updateBook, acceptBook, nextBook } = useAnalyzerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title ?? "");
  const [editAuthor, setEditAuthor] = useState(book.author ?? "");

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
    nextBook();
  };

  if (isPending) {
    return (
      <div className="px-4 py-6 border-t border-stone-700 bg-stone-800/50">
        <div className="flex items-center justify-center gap-3 text-stone-400">
          <Spinner size="md" />
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
            <Label>Title</Label>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>
          <div>
            <Label>Author</Label>
            <Input
              type="text"
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              placeholder="Enter author..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              rounded="lg"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              rounded="lg"
              size="sm"
              onClick={handleSave}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            {book.coverImage && (
              <img
                src={book.coverImage}
                alt={book.title ?? "Book cover"}
                className="w-16 h-24 object-cover rounded shadow-md flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {book.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-ui text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-ui text-amber-400">
                    <ShieldQuestion className="w-3.5 h-3.5" />
                    Unverified
                  </span>
                )}
              </div>
              <div>
                <span className="block text-stone-500 text-xs font-ui">Title</span>
                <span className="block text-stone-100 font-display text-lg leading-tight">
                  {book.title ?? (
                    <span className="text-stone-500 italic">Unknown</span>
                  )}
                </span>
              </div>
              <div className="mt-1">
                <span className="block text-stone-500 text-xs font-ui">Author</span>
                <span className="block text-stone-300 font-ui">
                  {book.author ?? (
                    <span className="text-stone-500 italic">Unknown</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              rounded="lg"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2.5"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            {!isAccepted ? (
              <Button
                rounded="lg"
                size="sm"
                onClick={handleAccept}
                className="flex-1 py-2.5"
              >
                <Check className="w-4 h-4" />
                Accept
              </Button>
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

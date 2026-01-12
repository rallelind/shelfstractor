import { useState, useEffect } from "react";
import { useAnalyzerStore, type Book } from "../../stores/analyzer";
import { Check, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button, Input, Spinner } from "../ui";
import type { BookCandidate, SearchResult } from "../../api";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const { selectCandidate, acceptBook, nextBook } = useAnalyzerStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setIsSearching(false);
    setSearchQuery("");
    setSearchResults([]);
    setCandidateIndex(0);
  }, [book.id]);

  const isPending = book.status === "pending";
  const isAccepted = book.status === "accepted";
  const hasCandidates = book.candidates.length > 0;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoadingSearch(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json() as { results: SearchResult[] };
      setSearchResults(data.results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    selectCandidate(book.id, {
      title: result.title,
      author: result.author,
      coverImage: result.coverImage,
      score: 100,
    });
    setIsSearching(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSelectCandidate = (candidate: BookCandidate) => {
    selectCandidate(book.id, candidate);
  };

  const handleAccept = () => {
    const candidate = book.candidates[candidateIndex];
    if (candidate) {
      handleSelectCandidate(candidate);
    }
    acceptBook(book.id);
    nextBook();
  };

  const currentCandidate = hasCandidates ? book.candidates[candidateIndex] : null;
  const displayTitle = currentCandidate?.title ?? book.title;
  const displayAuthor = currentCandidate?.author ?? book.author;
  const displayCover = currentCandidate?.coverImage ?? book.coverImage;

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

  if (isSearching) {
    return (
      <div className="px-4 py-4 border-t border-stone-700 bg-stone-800/50">
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a book..."
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              rounded="lg"
              size="sm"
              disabled={isLoadingSearch || !searchQuery.trim()}
            >
              {isLoadingSearch ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full flex gap-3 p-2 rounded-lg border border-stone-600 bg-stone-700/50 hover:bg-stone-700 hover:border-stone-500 transition-colors text-left"
                >
                  {result.coverImage ? (
                    <img
                      src={result.coverImage}
                      alt={result.title}
                      className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-stone-600 rounded flex-shrink-0 flex items-center justify-center">
                      <span className="text-stone-400 text-xs">?</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block text-stone-100 font-display text-sm leading-tight truncate">
                      {result.title}
                    </span>
                    <span className="block text-stone-400 font-ui text-xs mt-0.5 truncate">
                      {result.author ?? "Unknown author"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Button
            variant="secondary"
            rounded="lg"
            size="sm"
            onClick={() => {
              setIsSearching(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (book.failureReason) {
    return (
      <div className="px-4 py-4 border-t border-stone-700 bg-stone-800/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-ui text-red-400">
            Could not identify book
          </span>
        </div>
        <p className="text-stone-400 text-sm mb-4">
          {book.failureReason}
        </p>
        <Button
          variant="secondary"
          rounded="lg"
          size="sm"
          onClick={() => setIsSearching(true)}
          className="w-full"
        >
          <Search className="w-4 h-4" />
          Search for book
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-t border-stone-700 bg-stone-800/50">
      <div className="space-y-3">
        {hasCandidates && (
          <div className="flex items-center justify-between text-sm text-stone-400 font-ui">
            <span>
              {candidateIndex + 1} of {book.candidates.length} matches
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCandidateIndex((i) => Math.max(0, i - 1))}
                disabled={candidateIndex === 0}
                className="p-1 rounded hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCandidateIndex((i) => Math.min(book.candidates.length - 1, i + 1))}
                disabled={candidateIndex === book.candidates.length - 1}
                className="p-1 rounded hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {displayCover ? (
            <img
              src={displayCover}
              alt={displayTitle ?? "Book cover"}
              className="w-16 h-24 object-cover rounded shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-24 bg-stone-600 rounded flex-shrink-0 flex items-center justify-center">
              <span className="text-stone-400 text-xs">?</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isAccepted && (
              <div className="flex items-center gap-1 mb-1 text-xs font-ui text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Accepted
              </div>
            )}
            <div>
              <span className="block text-stone-500 text-xs font-ui">Title</span>
              <span className="block text-stone-100 font-display text-lg leading-tight">
                {displayTitle ?? <span className="text-stone-500 italic">Unknown</span>}
              </span>
            </div>
            <div className="mt-1">
              <span className="block text-stone-500 text-xs font-ui">Author</span>
              <span className="block text-stone-300 font-ui">
                {displayAuthor ?? <span className="text-stone-500 italic">Unknown</span>}
              </span>
            </div>
          </div>
        </div>

        {!isAccepted && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              rounded="lg"
              size="sm"
              onClick={() => setIsSearching(true)}
              className="flex-1 py-2.5"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
            <Button
              rounded="lg"
              size="sm"
              onClick={handleAccept}
              className="flex-1 py-2.5"
            >
              <Check className="w-4 h-4" />
              Accept
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

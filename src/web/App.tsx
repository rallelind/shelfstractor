import { BookIllustrations } from "./components/illustrations/BookIllustrations";
import "./index.css";
import { Analyzer } from "./components/image-analyzer/Analyzer";

export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 antialiased">
      <main className="max-w-md w-full text-center space-y-8">
        <header className="space-y-3">
          <h1 className="text-5xl font-normal font-display text-stone-100 tracking-tight">
            Unbind
          </h1>
        </header>

        <div className="flex justify-center py-4">
          <BookIllustrations
            width={200}
            height={168}
            className="text-stone-400 drop-shadow-lg"
          />
        </div>

        <p className="text-stone-400 text-lg leading-relaxed px-4">
          Simply take a photo of your bookshelf and we'll identify every title
          to unbind them from the physical shelf and adding them to your digital
          library.
        </p>

        <div className="pt-4 flex justify-center">
          <Analyzer />
        </div>
      </main>
    </div>
  );
}

export default App;

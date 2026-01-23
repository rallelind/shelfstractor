import SwiftUI  

@Observable
class AnalyzerViewModel {
    var status: AnalyzerStatus = .idle
    var books: [Book] = []
    var currentBookIndex: Int = 0
    var extractedCount: Int = 0
    var selectedImage: UIImage?

    private let service = AnalyzerService()

    var currentBook: Book? {
        guard currentBookIndex < books.count else { return nil }
        return books[currentBookIndex]
    }

    var pendingCount: Int {
        books.filter { $0.status != .accepted }.count
    }

    func reset() {
        status = .idle
        books = []
        currentBookIndex = 0
        extractedCount = 0
        selectedImage = nil
    }

    func analyze() async {
        guard let image = selectedImage else { return }

        status = .detecting
        books = []
        extractedCount = 0

        await service.analyze(image: image, viewModel: self)
    }

    func setDetections(_ detections: [DetectionBook]) {
        books = detections.map { Book(from: $0) }
        status = .extracting
    }

    func addExtraction(_ extraction: ExtractionResult) {
        guard let index = books.firstIndex(where: { $0.id == extraction.id }) else { return }
        books[index].apply(extraction)
        extractedCount += 1
    }

    func setComplete() {
        status = .complete
    }

    func setError(_ error: String) {
        status = .error(error)
    }

    func acceptBook(id: String) {
        guard let index = books.firstIndex(where: { $0.id == id }) else { return }
        books[index].status = .accepted
    }

    func nextBook() {
        guard currentBookIndex < books.count - 1 else { return }
        currentBookIndex += 1
    }

    func prevBook() {
        guard currentBookIndex > 0 else { return }
        currentBookIndex -= 1
    }
}
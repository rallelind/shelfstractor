import Foundation
import UIKit

class AnalyzerService {
    private let baseUrl = "http://localhost:3000/api"

    func analyze(image: UIImage, viewModel: AnalyzerViewModel) async {
        print("📸 Starting analyze...")

        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            await MainActor.run { viewModel.setError("Failed to process image") }
            return
        }

        print("📦 Image data size: \(imageData.count) bytes")

        let base64String = "data:image/jpeg;base64,\(imageData.base64EncodedString())"

        guard let url = URL(string: "\(baseUrl)/analyze") else {
            await MainActor.run { viewModel.setError("Invalid URL") }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["imageBase64": base64String]

        print("📤 Sending request to \(url)")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            await MainActor.run {
                viewModel.setError("Failed to serialize body: \(error.localizedDescription)")
            }
            return
        }

        do {
            let (bytes, _) = try await URLSession.shared.bytes(for: request)

            print("✅ Got response stream")

            var currentEvent: String?

            for try await line in bytes.lines {
                print("📥 Line: \(line)")

                if line.hasPrefix("event: ") {
                    currentEvent = String(line.dropFirst(7))
                    continue
                }

                if line.hasPrefix("data: ") {
                    let jsonString = String(line.dropFirst(6))
                    print("🎯 Event: \(currentEvent ?? "nil"), Data: \(jsonString.prefix(100))...")

                    await handleEvent(event: currentEvent, data: jsonString, viewModel: viewModel)
                    currentEvent = nil
                }
            }

            print("✅ Stream finished")

        } catch {
            print("❌ Error: \(error)")

            await MainActor.run {
                viewModel.setError("Failed to read response: \(error.localizedDescription)")
            }
        }
    }

    private func handleEvent(event: String?, data: String, viewModel: AnalyzerViewModel) async {
        guard let data = data.data(using: .utf8) else { return }

        await MainActor.run {
            switch event {
            case "detections":
                if let response = try? JSONDecoder().decode(DetectionResponse.self, from: data) {
                    viewModel.setDetections(response.books)
                }

            case "extraction":
                if let extraction = try? JSONDecoder().decode(ExtractionResult.self, from: data) {
                    viewModel.addExtraction(extraction)
                }

            case "complete":
                viewModel.setComplete()

            case "error":
                if let error = try? JSONDecoder().decode(ErrorMessage.self, from: data) {
                    viewModel.setError(error.message)
                }

            default:
                break
            }
        }
    }
}

struct DetectionResponse: Codable {
    let total: Int
    let books: [DetectionBook]
}

struct ErrorMessage: Codable {
    let message: String
}

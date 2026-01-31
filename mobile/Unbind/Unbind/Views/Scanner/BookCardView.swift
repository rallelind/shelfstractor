import SwiftUI

struct BookCardView: View {
    let book: Book
    @Environment(AnalyzerViewModel.self) var viewModel

    var body: some View {
        VStack(spacing: 0) {
            if book.status == .pending {
                HStack(spacing: 12) {
                    ProgressView()
                        .tint(Color.stone400)
                    Text("Extracting book info...")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.stone400)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                VStack(spacing: 12) {
                    // Book info
                    HStack(alignment: .top, spacing: 12) {
                        // Cover placeholder
                        BookCoverView(coverUrl: book.coverImage)

                        // Title & Author
                        VStack(alignment: .leading, spacing: 4) {
                            if book.status == .accepted {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12))
                                    Text("Accepted")
                                        .font(.system(size: 12))
                                }
                                .foregroundStyle(Color.green)
                                .padding(.bottom, 2)
                            }

                            Text("Title")
                                .font(.system(size: 12))
                                .foregroundStyle(Color.stone500)
                            Text(book.title ?? "Unknown")
                                .font(.custom("PlayfairDisplay", size: 18))
                                .foregroundStyle(Color.stone100)

                            Text("Author")
                                .font(.system(size: 12))
                                .foregroundStyle(Color.stone500)
                                .padding(.top, 4)
                            Text(book.author ?? "Unknown")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.stone300)
                        }

                        Spacer()
                    }

                    // Accept button
                    if book.status != .accepted {
                        Button {
                            viewModel.acceptBook(id: book.id)
                            viewModel.nextBook()
                        } label: {
                            Label("Accept", systemImage: "checkmark")
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                }
                .padding(16)
            }
        }
        .frame(maxWidth: .infinity)
        .background(Color.stone800.opacity(0.5))
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundStyle(Color.stone700),
            alignment: .top
        )
        .onAppear {
            print("Cover URL: \(book.coverImage ?? "nil")")
        }
    }
}

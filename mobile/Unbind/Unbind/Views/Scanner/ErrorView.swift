import SwiftUI

struct ErrorView: View {
    var error: String
    var onRetry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .resizable()
                .scaledToFit()
                .frame(width: 48, height: 48)
                .foregroundStyle(.red.opacity(0.7))  // red-400 equivalent
                .padding(.bottom, 12)

            Text("Something went wrong")
                .font(.system(size: 18, weight: .medium))  // font-ui text-lg
                .foregroundStyle(Color.stone300)

            Text(error)
                .font(.system(size: 14))
                .foregroundStyle(Color.stone500)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)

            Button {
                onRetry()
            } label: {
                Label("Try Again", systemImage: "arrow.counterclockwise")
            }
            .buttonStyle(SecondaryButtonStyle())
            .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

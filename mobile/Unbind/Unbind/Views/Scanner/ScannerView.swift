import SwiftUI

struct ScannerView: View {

    @Environment(AnalyzerViewModel.self) var viewModel
    @State private var showCamera = false
    @State private var showLibrary = false

    var body: some View {
        @Bindable var viewModel = viewModel
        VStack(spacing: 0) {
            Capsule()
                .fill(Color.stone500)
                .frame(width: 48, height: 6)
                .padding(.top, 12)
                .padding(.bottom, 20)

            switch viewModel.status {
            case .idle:
                IdleView(
                    onTakePhoto: {
                        showCamera = true
                    },
                    onChooseFromLibrary: {
                        showLibrary = true
                    })
            case .detecting:
                DetectingView()
            case .extracting:
                EmptyView()
            case .complete:
                EmptyView()
            case .error(let message):
                ErrorView(error: message, onRetry: {
                    viewModel.reset()
                })
            }

        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.stone800)
        .presentationDetents([.large])
        .presentationDragIndicator(.hidden)
        .sheet(isPresented: $showCamera) {
            ImagePicker(image: $viewModel.selectedImage, sourceType: .camera)
        }
        .sheet(isPresented: $showLibrary) {
            ImagePicker(image: $viewModel.selectedImage, sourceType: .photoLibrary)
        }
        .onChange(of: viewModel.selectedImage) { oldValue, newValue in
            if newValue != nil {
                Task {
                    await viewModel.analyze()
                }
            }
        }
    }
}

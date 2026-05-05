import { useState } from 'react';
import { NicknameModal, IdentityBadge } from '@/features/identity';
import { TagSelector } from '@/features/tagging';
import { MeltingPot } from '@/features/melting-pot';
import { MatrixView, BatchSubmitBar } from '@/features/matrix';
import { ToastContainer } from '@/components/Toast';
import { useMatrixStore } from '@/store';

function App() {
  const [businessLine, setBusinessLine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const { matrix, clearAll } = useMatrixStore();

  return (
    <>
      <NicknameModal />
      <ToastContainer />

      <MeltingPot>
        <div className="min-h-screen bg-gray-50">
          {/* Top Nav */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">
              Tryon Collector
            </h1>
            <IdentityBadge />
          </header>

          {/* Main Content */}
          <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            {/* Tag Selector */}
            <section className="bg-white rounded-lg p-4 border border-gray-200">
              <TagSelector
                businessLine={businessLine}
                category={category}
                onBusinessLineChange={setBusinessLine}
                onCategoryChange={setCategory}
              />
            </section>

            {/* Dropzone hint */}
            {matrix.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">
                  将图片拖入窗口，或使用 Ctrl/Cmd+V 粘贴
                </p>
                <p className="text-sm mt-2">
                  支持 JPG / PNG / WebP，按文件名自动聚类
                </p>
              </div>
            )}

            {/* Matrix */}
            {matrix.length > 0 && (
              <section>
                <MatrixView />
                <BatchSubmitBar
                  businessLine={businessLine ?? ''}
                  category={category ?? ''}
                />
                <button
                  onClick={() => {
                    const { files } = useMatrixStore.getState();
                    for (const f of files) URL.revokeObjectURL(f.blobUrl);
                    clearAll();
                  }}
                  className="text-sm text-gray-400 hover:text-red-500 mt-2"
                >
                  清空全部
                </button>
              </section>
            )}
          </main>
        </div>
      </MeltingPot>
    </>
  );
}

export default App;

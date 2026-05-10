import { useState } from 'react';
import { Route, Switch, Link } from 'wouter';
import { NicknameModal, IdentityBadge } from '@/features/identity';
import { TagSelector, TagManager } from '@/features/tagging';
import { ManualSort } from '@/features/manual-sort';
import { MeltingPot } from '@/features/melting-pot';
import { MatrixView, BatchSubmitBar } from '@/features/matrix';
import { GamificationSidebar } from '@/features/gamification';
import { AuditPage } from '@/features/audit';
import { ToastContainer } from '@/components/Toast';
import { useMatrixStore } from '@/store';
import { ManualSubmitBar } from '@/features/manual-sort/ManualSubmitBar';

function MainPage() {
  const [businessLine, setBusinessLine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const { files, clearAll } = useMatrixStore();

  const content = (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Tryon Collector</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/audit"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            审计页
          </Link>
          <Link
            href="/tags"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            标签管理
          </Link>
          <IdentityBadge />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        <main className="flex-1 space-y-6">
          {/* Tag Selector */}
          <section className="bg-white rounded-lg p-4 border border-gray-200">
            <TagSelector
              businessLine={businessLine}
              category={category}
              onBusinessLineChange={setBusinessLine}
              onCategoryChange={setCategory}
            />
          </section>

          {/* Manual Mode (default) */}
          {mode === 'manual' && (
            <>
              <ManualSort onSwitchMode={() => setMode('auto')} />
              <ManualSubmitBar
                businessLine={businessLine ?? ''}
                category={category ?? ''}
              />
            </>
          )}

          {/* Auto Clustering Mode */}
          {mode === 'auto' && (
            <>
              {/* Dropzone hint */}
              {files.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg">
                    将图片拖入窗口，或使用 Ctrl/Cmd+V 粘贴
                  </p>
                  <p className="text-sm mt-2">
                    支持 JPG / PNG，按文件名自动聚类
                  </p>
                </div>
              )}

              {/* Matrix + Unassigned */}
              {files.length > 0 && (
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

              <button
                onClick={() => setMode('manual')}
                className="text-sm text-gray-400 hover:text-blue-500"
              >
                ◀ 切换手动分拣
              </button>
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <GamificationSidebar />
        </aside>
      </div>
    </div>
  );

  // Auto mode wraps with MeltingPot dropzone
  if (mode === 'auto') {
    return <MeltingPot>{content}</MeltingPot>;
  }

  return content;
}

function App() {
  return (
    <>
      <NicknameModal />
      <ToastContainer />
      <Switch>
        <Route path="/audit" component={AuditPage} />
        <Route path="/tags" component={TagManager} />
        <Route component={MainPage} />
      </Switch>
    </>
  );
}

export default App;

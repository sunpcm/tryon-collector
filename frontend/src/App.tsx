import { useEffect, useState } from 'react';
import { Route, Switch } from 'wouter';
import { Banner } from '@/components/Banner';
import { TagSelector, TagManager } from '@/features/tagging';
import { ManualSort } from '@/features/manual-sort';
import { AuditPage } from '@/features/audit';
import { ShowcaseUploadPage, ShowcaseAuditPage } from '@/features/showcase';
import { ToastContainer } from '@/components/Toast';
import { NicknameModal } from '@/features/identity';
import { ManualSubmitBar } from '@/features/manual-sort/ManualSubmitBar';
import { useEditingStore } from '@/store';

function MainPage() {
  const editingBundle = useEditingStore(s => s.bundle);
  const setEditingBundle = useEditingStore(s => s.setBundle);
  const [businessLine, setBusinessLine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState<string>('');

  useEffect(() => {
    if (editingBundle) {
      setBusinessLine(editingBundle.business_line || null);
      setCategory(editingBundle.category || null);
      setInitialTitle(editingBundle.title || '');
    }
  }, [editingBundle]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <main className="space-y-6">
          {editingBundle && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-center justify-between">
              <span className="text-amber-800">
                正在编辑款号{' '}
                <code className="font-mono">{editingBundle.group_key}</code>
                ，提交后旧记录会被软删
              </span>
              <button
                className="text-amber-700 hover:text-amber-900 text-xs"
                onClick={() => {
                  setEditingBundle(null);
                  setInitialTitle('');
                }}
              >
                取消编辑
              </button>
            </div>
          )}

          <section className="bg-white rounded-lg p-4 border border-gray-200">
            <TagSelector
              businessLine={businessLine}
              category={category}
              onBusinessLineChange={setBusinessLine}
              onCategoryChange={setCategory}
            />
          </section>

          <ManualSort />
          <ManualSubmitBar
            businessLine={businessLine ?? ''}
            category={category ?? ''}
            replacesTaskId={editingBundle?.task_id}
            initialTitle={initialTitle}
            onSubmitted={() => {
              setEditingBundle(null);
              setInitialTitle('');
            }}
          />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <NicknameModal />
      <ToastContainer />
      <Switch>
        <Route path="/audit" component={AuditPage} />
        <Route path="/tags" component={TagManager} />
        <Route path="/showcase/audit" component={ShowcaseAuditPage} />
        <Route path="/showcase/monologue">
          <ShowcaseUploadPage
            lockedBrand="monologue"
            title="monologue 展示图采集"
          />
        </Route>
        <Route path="/showcase/laofengxiang">
          <ShowcaseUploadPage lockedBrand="老凤祥" title="老凤祥展示图采集" />
        </Route>
        <Route path="/showcase">
          <ShowcaseUploadPage />
        </Route>
        <Route component={MainPage} />
      </Switch>
    </>
  );
}

export default App;

import { useState } from 'react';
import { Route, Switch, Link } from 'wouter';
import { NicknameModal, IdentityBadge } from '@/features/identity';
import { TagSelector, TagManager } from '@/features/tagging';
import { ManualSort } from '@/features/manual-sort';
import { AuditPage } from '@/features/audit';
import { ToastContainer } from '@/components/Toast';
import { ManualSubmitBar } from '@/features/manual-sort/ManualSubmitBar';

function MainPage() {
  const [businessLine, setBusinessLine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  return (
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        <main className="space-y-6">
          {/* Tag Selector */}
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
        <Route component={MainPage} />
      </Switch>
    </>
  );
}

export default App;

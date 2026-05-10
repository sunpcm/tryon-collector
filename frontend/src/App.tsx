import { useState } from 'react';
import { Route, Switch } from 'wouter';
import { Banner } from '@/components/Banner';
import { TagSelector, TagManager } from '@/features/tagging';
import { ManualSort } from '@/features/manual-sort';
import { AuditPage } from '@/features/audit';
import { ToastContainer } from '@/components/Toast';
import { NicknameModal } from '@/features/identity';
import { ManualSubmitBar } from '@/features/manual-sort/ManualSubmitBar';

function MainPage() {
  const [businessLine, setBusinessLine] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Banner />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <main className="space-y-6">
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

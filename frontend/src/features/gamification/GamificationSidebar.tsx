import { useState, useEffect } from 'react';
import { useClusterConfigStore } from '@/store';

const STORAGE_KEY = 'tryon_submit_count';
const DEFAULT_REGEX = '(?<groupKey>[A-Z0-9]{4,}[-_]?\\d{2,})';

export function getSubmitCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
}

export function incrementSubmitCount(delta: number = 1) {
  const current = getSubmitCount();
  localStorage.setItem(STORAGE_KEY, String(current + delta));
}

export function GamificationSidebar() {
  const [count, setCount] = useState(getSubmitCount);
  const { config, setGroupKeyRegex, resetToDefault } = useClusterConfigStore();
  const [regexInput, setRegexInput] = useState(
    config.groupKeyRegex?.source ?? DEFAULT_REGEX
  );
  const [regexError, setRegexError] = useState(false);

  useEffect(() => {
    const handler = () => setCount(getSubmitCount());
    window.addEventListener('submit-count-changed', handler);
    return () => window.removeEventListener('submit-count-changed', handler);
  }, []);

  const handleRegexChange = (value: string) => {
    setRegexInput(value);
    try {
      new RegExp(value);
      setRegexError(false);
      setGroupKeyRegex(value);
    } catch {
      setRegexError(true);
    }
  };

  const handleReset = () => {
    resetToDefault();
    setRegexInput(DEFAULT_REGEX);
    setRegexError(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 text-sm">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">🏆 我的贡献</h3>
        <p className="text-gray-600">
          🎯 拦截 AI 翻车：<strong className="text-blue-600">{count}</strong> 次
        </p>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <h3 className="font-medium text-gray-700 mb-2">⚙️ 聚类规则</h3>
        <label className="block text-xs text-gray-500 mb-1">
          款号正则（需含 <code>groupKey</code> 命名组）
        </label>
        <input
          type="text"
          value={regexInput}
          onChange={e => handleRegexChange(e.target.value)}
          className={`w-full text-xs font-mono px-2 py-1.5 border rounded ${
            regexError ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
          spellCheck={false}
        />
        {regexError && (
          <p className="text-red-500 text-xs mt-1">无效正则表达式</p>
        )}
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 mt-1"
        >
          恢复默认
        </button>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <h3 className="font-medium text-gray-700 mb-2">💡 操作 Tips</h3>
        <ul className="text-gray-500 space-y-1.5 text-xs">
          <li>1. 支持直接框选 4 张图全屏拖入，系统会自动帮您识别并归位。</li>
          <li>2. 选中任意卡槽按下 Ctrl+V 即可直接粘贴截图。</li>
          <li>3. 按 Enter 提交，Esc 清空未归类，1-4 切换角色。</li>
        </ul>
      </div>
    </div>
  );
}

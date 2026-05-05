import { useState } from 'react';
import { Modal, Input } from 'animal-island-ui';
import { useIdentityStore } from '@/store';

export function NicknameModal() {
  const { nickname, setNickname } = useIdentityStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const isOpen = !nickname;

  const handleOk = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('请输入花名');
      return;
    }
    if (trimmed.length > 20) {
      setError('花名不超过 20 个字符');
      return;
    }
    setNickname(trimmed);
  };

  return (
    <Modal
      open={isOpen}
      title="欢迎使用 Tryon Collector"
      maskClosable={false}
      footer={null}
      typewriter={false}
    >
      <div className="py-4">
        <p className="text-sm text-gray-500 mb-4">
          请输入你的花名，用于标识提交记录
        </p>
        <Input
          size="large"
          placeholder="输入花名..."
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setError('');
          }}
          onKeyDown={e => e.key === 'Enter' && handleOk()}
          status={error ? 'error' : undefined}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        <button
          className="mt-4 w-full h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={handleOk}
        >
          确认
        </button>
      </div>
    </Modal>
  );
}

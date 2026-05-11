import { useState } from 'react';
import { Button, Modal, Input } from '@/components';
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
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          请输入你的花名，用于标识你提交的记录。
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">花名</label>
          <Input
            size="lg"
            placeholder="请输入你的花名"
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setError('');
            }}
            onKeyDown={e => e.key === 'Enter' && handleOk()}
            status={error ? 'error' : 'default'}
            autoFocus
          />
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <p className="text-xs text-gray-400">最多 20 个字符</p>
          )}
        </div>
        <Button variant="primary" size="lg" className="w-full" onClick={handleOk}>
          确认
        </Button>
      </div>
    </Modal>
  );
}

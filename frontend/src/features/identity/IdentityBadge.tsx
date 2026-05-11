import { useState } from 'react';
import { Button, Modal, Input } from '@/components';
import { useIdentityStore } from '@/store';

export function IdentityBadge() {
  const { nickname, setNickname, clearNickname } = useIdentityStore();
  const [showModal, setShowModal] = useState(false);
  const [newValue, setNewValue] = useState('');

  if (!nickname) return null;

  const handleChange = () => {
    const trimmed = newValue.trim();
    if (trimmed && trimmed.length <= 20) {
      setNickname(trimmed);
      setShowModal(false);
      setNewValue('');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">👤 {nickname}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700"
          onClick={() => {
            setNewValue(nickname);
            setShowModal(true);
          }}
        >
          切换
        </Button>
      </div>
      <Modal
        open={showModal}
        title="切换花名"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowModal(false)}
            >
              取消
            </Button>
            <Button variant="primary" size="md" onClick={handleChange}>
              确认
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            size="md"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChange()}
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            className="self-start h-auto px-2 py-0.5 text-xs text-gray-400 hover:bg-transparent hover:text-red-500"
            onClick={() => {
              clearNickname();
              setShowModal(false);
            }}
          >
            清除花名（重新输入）
          </Button>
        </div>
      </Modal>
    </>
  );
}

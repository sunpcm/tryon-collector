import { useState } from 'react';
import { Modal, Input } from 'animal-island-ui';
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
        <button
          className="text-xs text-blue-500 hover:text-blue-700"
          onClick={() => {
            setNewValue(nickname);
            setShowModal(true);
          }}
        >
          切换
        </button>
      </div>
      <Modal
        open={showModal}
        title="切换花名"
        onClose={() => setShowModal(false)}
        onOk={handleChange}
        typewriter={false}
      >
        <div className="py-2">
          <Input
            size="middle"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChange()}
            autoFocus
          />
          <button
            className="mt-2 text-xs text-gray-400 hover:text-red-500"
            onClick={() => {
              clearNickname();
              setShowModal(false);
            }}
          >
            清除花名（重新输入）
          </button>
        </div>
      </Modal>
    </>
  );
}

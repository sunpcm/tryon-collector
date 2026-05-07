import { describe, it, expect, beforeEach } from 'vitest';
import { useClusterConfigStore } from '../clusterConfig';

const STORAGE_KEY = 'tryon_cluster_config';

describe('clusterConfig store', () => {
  beforeEach(() => {
    localStorage.clear();
    useClusterConfigStore.setState({ config: {} });
  });

  it('loads empty config by default', () => {
    const { config } = useClusterConfigStore.getState();
    expect(config.groupKeyRegex).toBeUndefined();
    expect(config.roleKeywords).toBeUndefined();
  });

  it('setGroupKeyRegex updates config and persists', () => {
    useClusterConfigStore.getState().setGroupKeyRegex('(?<groupKey>SKU-\\d+)');
    const { config } = useClusterConfigStore.getState();
    expect(config.groupKeyRegex).toBeInstanceOf(RegExp);
    expect(config.groupKeyRegex!.source).toBe('(?<groupKey>SKU-\\d+)');

    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.groupKeyRegex).toBe('(?<groupKey>SKU-\\d+)');
  });

  it('ignores invalid regex', () => {
    useClusterConfigStore.getState().setGroupKeyRegex('(?<groupKey');
    const { config } = useClusterConfigStore.getState();
    expect(config.groupKeyRegex).toBeUndefined();
  });

  it('resetToDefault clears config', () => {
    useClusterConfigStore.getState().setGroupKeyRegex('(?<groupKey>SKU-\\d+)');
    useClusterConfigStore.getState().resetToDefault();
    const { config } = useClusterConfigStore.getState();
    expect(config.groupKeyRegex).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

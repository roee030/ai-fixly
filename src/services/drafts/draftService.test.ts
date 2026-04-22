import AsyncStorage from '@react-native-async-storage/async-storage';
import { draftService, DRAFT_TTL_MS } from './draftService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGet = AsyncStorage.getItem as jest.Mock;
const mockSet = AsyncStorage.setItem as jest.Mock;
const mockRemove = AsyncStorage.removeItem as jest.Mock;

describe('draftService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockRemove.mockReset();
  });

  it('saves a draft under the correct key with timestamp + version', async () => {
    await draftService.save('user-1', {
      description: 'leaky pipe',
      imageUris: ['file:///a.jpg'],
      videoAssets: [],
      analysis: null,
      chosenProfessions: ['plumber'],
    });

    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockSet.mock.calls[0];
    expect(key).toBe('draft:request:user-1');
    const parsed = JSON.parse(value);
    expect(parsed.description).toBe('leaky pipe');
    expect(parsed.analysisVersion).toBe('v1');
    expect(parsed.createdAt).toBeTruthy();
  });

  it('returns null when no draft exists', async () => {
    mockGet.mockResolvedValue(null);
    expect(await draftService.load('user-1')).toBeNull();
  });

  it('returns a fresh draft unchanged', async () => {
    const fresh = {
      createdAt: new Date().toISOString(),
      description: 'x',
      imageUris: [],
      videoAssets: [],
      analysis: null,
      chosenProfessions: [],
      analysisVersion: 'v1',
    };
    mockGet.mockResolvedValue(JSON.stringify(fresh));
    expect(await draftService.load('user-1')).toEqual(fresh);
  });

  it('drops and returns null for drafts older than 24h', async () => {
    const stale = {
      createdAt: new Date(Date.now() - DRAFT_TTL_MS - 1000).toISOString(),
      description: 'old',
      imageUris: [],
      videoAssets: [],
      analysis: null,
      chosenProfessions: [],
      analysisVersion: 'v1',
    };
    mockGet.mockResolvedValue(JSON.stringify(stale));
    expect(await draftService.load('user-1')).toBeNull();
    expect(mockRemove).toHaveBeenCalledWith('draft:request:user-1');
  });

  it('drops drafts with stale analysisVersion', async () => {
    const mismatch = {
      createdAt: new Date().toISOString(),
      description: 'x',
      imageUris: [],
      videoAssets: [],
      analysis: null,
      chosenProfessions: [],
      analysisVersion: 'v0',  // outdated
    };
    mockGet.mockResolvedValue(JSON.stringify(mismatch));
    expect(await draftService.load('user-1')).toBeNull();
    expect(mockRemove).toHaveBeenCalledWith('draft:request:user-1');
  });

  it('recovers from corrupted JSON by wiping the key', async () => {
    mockGet.mockResolvedValue('{not valid json');
    expect(await draftService.load('user-1')).toBeNull();
    expect(mockRemove).toHaveBeenCalledWith('draft:request:user-1');
  });

  it('remove() clears the storage key', async () => {
    await draftService.remove('user-1');
    expect(mockRemove).toHaveBeenCalledWith('draft:request:user-1');
  });
});

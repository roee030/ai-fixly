import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('starts with loading state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('sets user and marks authenticated', () => {
    useAuthStore.getState().setUser({ uid: '123', phoneNumber: '+972501234567' });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.uid).toBe('123');
    expect(state.isLoading).toBe(false);
  });

  it('clears user on null', () => {
    useAuthStore.getState().setUser({ uid: '123', phoneNumber: '+972501234567' });
    useAuthStore.getState().setUser(null);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('sets profile completion', () => {
    useAuthStore.getState().setHasCompletedProfile(true);
    expect(useAuthStore.getState().hasCompletedProfile).toBe(true);
  });

  it('resets all state', () => {
    useAuthStore.getState().setUser({ uid: '123', phoneNumber: '+972501234567' });
    useAuthStore.getState().setHasCompletedProfile(true);
    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.hasCompletedProfile).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

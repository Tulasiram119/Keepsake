import { EMPTY_DATA } from '@/store/defaults';
import { useAppStore } from '@/store';

const actions = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({ ...EMPTY_DATA });
  jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00.000Z') });
});
afterEach(() => jest.useRealTimers());

describe('friends', () => {
  it('adds a friend with id, timestamps and tidied fields', () => {
    const f = actions().addFriend({ name: '  Ravi  ', phone: ' ', group: 'college ' });
    expect(f.id).toMatch(/[0-9a-f-]{36}/);
    expect(f).toMatchObject({ name: 'Ravi', group: 'college', createdAt: '2026-10-07T10:00:00.000Z' });
    expect(f.phone).toBeUndefined();
    expect(actions().friends).toHaveLength(1);
  });

  it('updates and bumps updatedAt', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    jest.setSystemTime(new Date('2026-10-08T10:00:00.000Z'));
    actions().updateFriend(f.id, { repeatEveryDays: 14 });
    expect(actions().friends[0]).toMatchObject({ repeatEveryDays: 14, updatedAt: '2026-10-08T10:00:00.000Z' });
  });

  it('archives and sets planned contact', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    actions().setArchived(f.id, true);
    actions().setPlannedContact(f.id, { at: '2026-10-10T12:00:00.000Z', type: 'called' });
    expect(actions().friends[0]).toMatchObject({ archived: true, nextPlanned: { type: 'called' } });
    actions().setPlannedContact(f.id, undefined);
    expect(actions().friends[0].nextPlanned).toBeUndefined();
  });

  it('deleteFriend removes interactions and unlinks gratitude atomically', () => {
    const ravi = actions().addFriend({ name: 'Ravi' });
    const asha = actions().addFriend({ name: 'Asha' });
    actions().logInteraction({ friendId: ravi.id, type: 'met', date: '2026-10-01T10:00:00.000Z' });
    actions().logInteraction({ friendId: asha.id, type: 'called', date: '2026-10-02T10:00:00.000Z' });
    const solo = actions().addGratitude({ text: 'Helped me move', date: '2026-10-01T10:00:00.000Z', friendIds: [ravi.id] });
    const both = actions().addGratitude({ text: 'Road trip', date: '2026-10-01T10:00:00.000Z', friendIds: [ravi.id, asha.id] });

    actions().deleteFriend(ravi.id);

    const s = actions();
    expect(s.friends.map((f) => f.name)).toEqual(['Asha']);
    expect(s.interactions.map((i) => i.friendId)).toEqual([asha.id]);
    expect(s.gratitude.find((g) => g.id === solo.id)?.friendIds).toEqual([]);
    expect(s.gratitude.find((g) => g.id === both.id)?.friendIds).toEqual([asha.id]);
  });
});

describe('interactions', () => {
  it('logs, edits and deletes', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    const i = actions().logInteraction({ friendId: f.id, type: 'texted', date: '2026-10-05T10:00:00.000Z', note: '  hi ' });
    expect(i.note).toBe('hi');
    actions().updateInteraction(i.id, { type: 'called', note: '' });
    expect(actions().interactions[0]).toMatchObject({ type: 'called', note: undefined });
    actions().deleteInteraction(i.id);
    expect(actions().interactions).toEqual([]);
  });

  it('clears the planned contact when logging on or after its day', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    actions().setPlannedContact(f.id, { at: '2026-10-07T18:00:00.000Z', type: 'called' });
    actions().logInteraction({ friendId: f.id, type: 'texted', date: '2026-10-05T10:00:00.000Z' });
    expect(actions().friends[0].nextPlanned).toBeDefined();
    actions().logInteraction({ friendId: f.id, type: 'called', date: '2026-10-07T09:00:00.000Z' });
    expect(actions().friends[0].nextPlanned).toBeUndefined();
  });
});

describe('gratitude', () => {
  it('adds with trimmed text and de-duplicated friends, edits and deletes', () => {
    const g = actions().addGratitude({ text: ' Sunny walk ', date: '2026-10-07T10:00:00.000Z', friendIds: ['x', 'x'], tag: ' ' });
    expect(g).toMatchObject({ text: 'Sunny walk', friendIds: ['x'], tag: undefined });
    actions().updateGratitude(g.id, { text: 'Sunny morning walk', tag: 'nature' });
    expect(actions().gratitude[0]).toMatchObject({ text: 'Sunny morning walk', tag: 'nature' });
    actions().deleteGratitude(g.id);
    expect(actions().gratitude).toEqual([]);
  });
});

describe('settings & persistence', () => {
  it('defaults the daily prompt off and updates settings', () => {
    expect(actions().settings.dailyPromptEnabled).toBe(false);
    actions().updateSettings({ theme: 'warm-dark' });
    expect(actions().settings.theme).toBe('warm-dark');
  });

  it('persists data but not hasHydrated', () => {
    const { partialize, name, version } = useAppStore.persist.getOptions();
    expect(name).toBe('keepsake-store');
    expect(version).toBe(1);
    const persisted = partialize!(useAppStore.getState()) as Record<string, unknown>;
    expect(Object.keys(persisted).sort()).toEqual(['friends', 'gratitude', 'interactions', 'settings']);
  });
});

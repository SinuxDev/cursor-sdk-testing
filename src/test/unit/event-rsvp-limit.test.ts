import { getEventRsvpLimit } from '../../models/event.model';

describe('getEventRsvpLimit', () => {
  it('returns explicit rsvpLimit when set', () => {
    expect(getEventRsvpLimit({ capacity: 100, rsvpLimit: 25 })).toBe(25);
  });

  it('falls back to capacity when rsvpLimit is unset', () => {
    expect(getEventRsvpLimit({ capacity: 100 })).toBe(100);
  });
});

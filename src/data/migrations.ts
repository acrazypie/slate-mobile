// Turns stored data (or an imported backup) of any older schema version into
// the current one. Each step takes the raw object of version N-1 and returns
// version N; they run in order, then the result is validated.
//
// To change the stored shape: bump SCHEMA_VERSION in schema.ts and add
// MIGRATIONS[newVersion] here. Never edit an existing step once it shipped.

import { SCHEMA_VERSION } from './schema';

type Raw = Record<string, unknown>;

export const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  // 1: first local schema. Version 0 (missing) means a hand-made file shaped
  // like version 1 without the field, so there is nothing to change.
  1: (data) => data,
  // 2: shifts get an unpaid break (none before), and rotations appear.
  2: (data) => ({
    ...data,
    shifts: Array.isArray(data.shifts)
      ? data.shifts.map((s) => (typeof s === 'object' && s !== null ? { break_minutes: 0, ...s } : s))
      : data.shifts,
    rotations: Array.isArray(data.rotations) ? data.rotations : [],
  }),
  // 3: events and shifts may carry their own reminder (undefined = the default lead
  // time); settings get a notifications block, which the settings loader fills in.
  3: (data) => data,
};

export class TooNewError extends Error {
  constructor(public readonly version: number) {
    super(`schema version ${version} is newer than this app (${SCHEMA_VERSION})`);
  }
}

export function migrate(data: Raw): Raw {
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new TooNewError(version);
  let current = data;
  while (version < SCHEMA_VERSION) {
    version += 1;
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`missing migration to schema version ${version}`);
    current = { ...step(current), schemaVersion: version };
  }
  return current;
}

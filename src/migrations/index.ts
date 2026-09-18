import * as migration_20260918_052152_initial_schema from './20260918_052152_initial_schema';
import * as migration_20260918_102500_add_form_submission_policy from './20260918_102500_add_form_submission_policy';

export const migrations = [
  {
    up: migration_20260918_052152_initial_schema.up,
    down: migration_20260918_052152_initial_schema.down,
    name: '20260918_052152_initial_schema',
  },
  {
    up: migration_20260918_102500_add_form_submission_policy.up,
    down: migration_20260918_102500_add_form_submission_policy.down,
    name: '20260918_102500_add_form_submission_policy'
  },
];

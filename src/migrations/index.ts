import * as migration_20260918_052152_initial_schema from './20260918_052152_initial_schema';
import * as migration_20260918_102500_add_form_submission_policy from './20260918_102500_add_form_submission_policy';
import * as migration_20260918_183913_add_event_image_display_settings from './20260918_183913_add_event_image_display_settings';
import * as migration_20260918_185028_add_event_image_display_crop_option from './20260918_185028_add_event_image_display_crop_option';
import * as migration_20260923_155724_hotfix_members_and_registration from './20260923_155724_hotfix_members_and_registration';
import * as migration_20260923_164845_upgrade_payload_3_90 from './20260923_164845_upgrade_payload_3_90';
import * as migration_20260924_000000_form_assignment_lifecycle from './20260924_000000_form_assignment_lifecycle';
import * as migration_20260924_000100_team_members_academic_year_tag from './20260924_000100_team_members_academic_year_tag';

export const migrations = [
  {
    up: migration_20260918_052152_initial_schema.up,
    down: migration_20260918_052152_initial_schema.down,
    name: '20260918_052152_initial_schema',
  },
  {
    up: migration_20260918_102500_add_form_submission_policy.up,
    down: migration_20260918_102500_add_form_submission_policy.down,
    name: '20260918_102500_add_form_submission_policy',
  },
  {
    up: migration_20260918_183913_add_event_image_display_settings.up,
    down: migration_20260918_183913_add_event_image_display_settings.down,
    name: '20260918_183913_add_event_image_display_settings',
  },
  {
    up: migration_20260918_185028_add_event_image_display_crop_option.up,
    down: migration_20260918_185028_add_event_image_display_crop_option.down,
    name: '20260918_185028_add_event_image_display_crop_option',
  },
  {
    up: migration_20260923_155724_hotfix_members_and_registration.up,
    down: migration_20260923_155724_hotfix_members_and_registration.down,
    name: '20260923_155724_hotfix_members_and_registration',
  },
  {
    up: migration_20260923_164845_upgrade_payload_3_90.up,
    down: migration_20260923_164845_upgrade_payload_3_90.down,
    name: '20260923_164845_upgrade_payload_3_90'
  },
  {
    up: migration_20260924_000000_form_assignment_lifecycle.up,
    down: migration_20260924_000000_form_assignment_lifecycle.down,
    name: '20260924_000000_form_assignment_lifecycle',
  },
  {
    up: migration_20260924_000100_team_members_academic_year_tag.up,
    down: migration_20260924_000100_team_members_academic_year_tag.down,
    name: '20260924_000100_team_members_academic_year_tag',
  },
];

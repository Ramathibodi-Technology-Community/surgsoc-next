import * as migration_20260918_052152_initial_schema from './20260918_052152_initial_schema';
import * as migration_20260918_102500_add_form_submission_policy from './20260918_102500_add_form_submission_policy';
import * as migration_20260918_183913_add_event_image_display_settings from './20260918_183913_add_event_image_display_settings';
import * as migration_20260918_185028_add_event_image_display_crop_option from './20260918_185028_add_event_image_display_crop_option';

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
    name: '20260918_185028_add_event_image_display_crop_option'
  },
];

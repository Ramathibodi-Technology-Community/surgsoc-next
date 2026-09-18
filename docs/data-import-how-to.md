# Data Import How-To

This guide explains how to bulk import data from the admin page:

- URL: `/admin/data-import`
- Permission required: admin user with `manage_users`

## Supported Import Types

The import tool is now separated by data type. Choose one type per import run:

1. `Users`
2. `Events`
3. `Forms`
4. `Form Submissions`

Each type has its own validation schema and import logic.

## Supported Formats

1. `CSV` (recommended for bulk imports)
2. `JSON`

Use the format selector on the import page. The tool also provides:

- `Download TEMPLATE` button for the currently selected type + format
- `Paste SAMPLE` button for quick testing

## Import Workflow

1. Open `/admin/data-import`.
2. Choose `Data Type`.
3. Choose `Input Format`.
4. Upload file or paste content.
5. Click `Validate ...` first.
6. Fix any validation errors.
7. Click `Import ...`.
8. Review summary and details.

## Type Schemas

### 1. Users

Required fields:

- `email`

Common optional fields:

- `password`
- `roles` (CSV: use comma-separated or pipe-separated values)
- `department`
- `name_thai_first_name`, `name_thai_last_name`, `name_thai_nickname`
- `name_english_first_name`, `name_english_last_name`, `name_english_nickname`
- `student_id`, `track`, `year`
- `line_id`, `phone_number`
- `dob`, `image_url`

Behavior:

- Upsert by `email`.
- Non-visitor roles require profile completeness. If missing required profile fields, validation fails.
- Invalid roles fail validation.

Example CSV:

```csv
email,password,roles,department,name_thai_first_name,name_thai_last_name,name_thai_nickname,name_english_first_name,name_english_last_name,name_english_nickname,student_id,track,year,line_id,phone_number,dob,image_url
member-import@example.com,change-me,member,OD,สมชาย,ใจดี,ชาย,Somchai,Jaidee,Chai,65001234,MD,Year_3,somchai_line,0812345678,2001-04-20,https://example.com/avatar.jpg
```

### 2. Events

Required fields:

- `name`
- `event_type`
- `date_begin`

Common optional fields:

- `date_end`, `description`, `is_visible`, `department`
- `location`, `subscription_form`
- `registration_opens_at`, `registration_closes_at`
- `participant_limit`, `status_override`, `is_registration_closed`
- `owner`, `coordinator`

Behavior:

- Upsert by `(name + date_begin)`.
- `event_type`, `department`, `status_override` must be valid enum values.

Example CSV:

```csv
name,event_type,date_begin,date_end,description,is_visible,department,location,subscription_form,registration_opens_at,registration_closes_at,participant_limit,status_override,is_registration_closed,owner,coordinator
Imported Workshop,workshop_observe,2026-05-01T09:00:00Z,2026-05-01T12:00:00Z,Imported through admin data-import,true,OD,1,1,2026-04-20T00:00:00Z,2026-04-30T23:59:59Z,50,auto,false,1,1
```

### 3. Forms

Required fields:

- `title`

Common optional fields:

- `submit_button_label`
- `confirmation_type`
- `confirmation_message_text`
- `redirect_url`
- `fields_json`
- `emails_json`
- `accept_responses`, `response_deadline`, `response_limit`
- `closed_message_json`

Behavior:

- Upsert by `title`.
- If `confirmation_type=redirect`, then `redirect_url` is required.
- `fields_json` and `emails_json` must be valid JSON arrays when provided.

Example CSV:

```csv
title,submit_button_label,confirmation_type,confirmation_message_text,redirect_url,fields_json,emails_json,accept_responses,response_deadline,response_limit,closed_message_json
Imported Form,Submit,message,Thanks for submitting!,,"[{""blockType"":""text"",""name"":""fullName"",""label"":""Full Name"",""required"":true}]",[],true,2026-06-01T12:00:00Z,100,{}
```

### 4. Form Submissions

Required fields:

- `form`
- `submissionData` entries

Common optional fields:

- `user`

Behavior:

- Creates submissions (no upsert).
- CSV supports two patterns:
  1. Grouped rows with `submission_group + field + value`
  2. Raw JSON via `submissionData_json`

Example CSV:

```csv
submission_group,form,user,field,value,submissionData_json
sub-1,1,1,fullName,Jane Doe,
sub-1,1,1,studentId,65009999,
sub-2,1,2,,,"[{""field"":""fullName"",""value"":""John Doe""}]"
```

## JSON Input Rules

JSON import accepts either:

1. A top-level array of documents (preferred)
2. An object containing a typed key array:
   - `users`
   - `events`
   - `forms`
   - `formSubmissions` or `form-submissions`

Examples:

```json
[
  {
    "email": "user@example.com",
    "roles": ["member"]
  }
]
```

```json
{
  "users": [
    {
      "email": "user@example.com",
      "roles": ["member"]
    }
  ]
}
```

## Troubleshooting

1. Validation fails on enum fields:
   - Check values exactly match allowed options in Payload.
2. Relationship errors (`user`, `form`, `location`, etc.):
   - Ensure referenced IDs already exist.
3. User profile completeness errors:
   - For non-visitor roles, fill required profile fields.
4. CSV parse issues:
   - Ensure header row exists.
   - Quote JSON payload columns and escape quotes by doubling (`""`).
5. Large imports:
   - Start with a small sample to validate mapping before full batch import.

## Recommended Bulk Import Strategy

1. Import `Users` first.
2. Import `Forms`.
3. Import `Events`.
4. Import `Form Submissions` last.

This order reduces foreign-key and relation errors.

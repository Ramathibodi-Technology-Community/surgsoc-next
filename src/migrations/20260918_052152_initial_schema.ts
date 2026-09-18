import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('visitor', 'member', 'staff_probation', 'staff', 'deputy_vp', 'vp', 'admin', 'superadmin');
  CREATE TYPE "public"."enum_users_portfolio_year" AS ENUM('2023', '2024', '2025', '2026', '2027');
  CREATE TYPE "public"."enum_events_status_override" AS ENUM('auto', 'open', 'closed');
  CREATE TYPE "public"."enum_groups_type" AS ENUM('system', 'role', 'department', 'access');
  CREATE TYPE "public"."enum_registrations_status" AS ENUM('subscribed', 'applicant', 'accepted', 'rejected', 'confirmed', 'declined', 'participant', 'withdrawn');
  CREATE TYPE "public"."enum_tags_kind" AS ENUM('event_type', 'department', 'specialty', 'academic_title', 'year', 'track', 'location');
  CREATE TYPE "public"."enum_feature_requests_type" AS ENUM('bug', 'feature');
  CREATE TYPE "public"."enum_feature_requests_status" AS ENUM('open', 'planned', 'in_progress', 'done', 'closed');
  CREATE TYPE "public"."enum_forms_blocks_checkbox_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_checkbox_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_email_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_email_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_message_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_message_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_number_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_number_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_select_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_select_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_text_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_text_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_textarea_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_textarea_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_radio_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_radio_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_date_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_date_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_slider_variant" AS ENUM('rating', 'stars', 'slider');
  CREATE TYPE "public"."enum_forms_blocks_slider_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_slider_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_ranking_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_ranking_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_checkbox_group_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_checkbox_group_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_blocks_user_profile_profile_field" AS ENUM('email', 'name_english.first_name', 'name_english.last_name', 'name_english.nickname', 'name_thai.first_name', 'name_thai.last_name', 'name_thai.nickname', 'academic.student_id', 'academic.year', 'academic.track', 'contact.phone_number', 'contact.line_id');
  CREATE TYPE "public"."enum_forms_blocks_user_profile_conditional_action" AS ENUM('show', 'hide');
  CREATE TYPE "public"."enum_forms_blocks_user_profile_conditional_operator" AS ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than');
  CREATE TYPE "public"."enum_forms_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_social_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" varchar NOT NULL,
  	"handle" varchar NOT NULL
  );
  
  CREATE TABLE "users_portfolio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"year" "enum_users_portfolio_year" NOT NULL,
  	"activity" varchar NOT NULL,
  	"role" varchar
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"department_id" integer,
  	"google_id" varchar,
  	"image_url" varchar,
  	"dob" timestamp(3) with time zone,
  	"age" numeric,
  	"name_thai_first_name" varchar,
  	"name_thai_last_name" varchar,
  	"name_thai_nickname" varchar,
  	"full_name_thai" varchar,
  	"profile_complete" boolean,
  	"name_english_first_name" varchar,
  	"name_english_last_name" varchar,
  	"name_english_nickname" varchar,
  	"academic_student_id" varchar,
  	"academic_track_id" integer,
  	"academic_year_id" integer,
  	"contact_line_id" varchar,
  	"contact_phone_number" varchar,
  	"notification_preferences_email_opt_in" boolean DEFAULT true,
  	"is_sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"groups_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"event_type_id" integer NOT NULL,
  	"department_id" integer,
  	"date_begin" timestamp(3) with time zone NOT NULL,
  	"date_end" timestamp(3) with time zone,
  	"location_id" integer,
  	"image_url" varchar,
  	"description" varchar,
  	"is_visible" boolean DEFAULT true,
  	"info" jsonb,
  	"subscription_form_id" integer,
  	"registration_opens_at" timestamp(3) with time zone,
  	"registration_closes_at" timestamp(3) with time zone,
  	"participant_limit" numeric DEFAULT 0,
  	"is_registration_closed" boolean,
  	"status_override" "enum_events_status_override" DEFAULT 'auto',
  	"auto_promote" boolean,
  	"max_waiting_list" numeric,
  	"custom_acceptance_email" varchar,
  	"participant_detail" jsonb,
  	"loa_form_id" integer,
  	"reflection_form_id" integer,
  	"is_reflection_open" boolean,
  	"owner_id" integer,
  	"coordinator_id" integer,
  	"is_sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"groups_id" integer
  );
  
  CREATE TABLE "groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_groups_type" DEFAULT 'role' NOT NULL,
  	"tag_id" integer,
  	"description" varchar,
  	"permissions" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "groups_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_registrations_status" DEFAULT 'applicant',
  	"submission_id" integer,
  	"selected_at" timestamp(3) with time zone,
  	"selected_by_id" integer,
  	"rejection_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"assigned_by_id" integer,
  	"deadline" timestamp(3) with time zone,
  	"completed" boolean DEFAULT false,
  	"blocks_registration" boolean DEFAULT false,
  	"submission_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attendings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_thai_first_name" varchar NOT NULL,
  	"name_thai_last_name" varchar NOT NULL,
  	"name_english_first_name" varchar NOT NULL,
  	"name_english_last_name" varchar NOT NULL,
  	"title_id" integer,
  	"specialty_id" integer,
  	"is_secretary" boolean DEFAULT false,
  	"image_url" varchar,
  	"contact_email" varchar,
  	"contact_phone_number" varchar,
  	"bio" jsonb,
  	"is_visible" boolean DEFAULT true,
  	"is_sample" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"display_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"position" varchar NOT NULL,
  	"academic_year" varchar NOT NULL,
  	"is_current" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_tags_kind" NOT NULL,
  	"label" varchar NOT NULL,
  	"label_th" varchar,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "feature_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_feature_requests_type" DEFAULT 'feature' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"status" "enum_feature_requests_status" DEFAULT 'open',
  	"admin_notes" varchar,
  	"submitted_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_checkbox_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_checkbox_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_email_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_email_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"message" jsonb,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_message_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_message_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_number" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" numeric,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_number_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_number_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"placeholder" varchar,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_select_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_select_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_text_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_text_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_textarea_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_textarea_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_radio_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_radio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_radio_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_radio_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_date" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" timestamp(3) with time zone,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_date_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_date_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"variant" "enum_forms_blocks_slider_variant" DEFAULT 'rating',
  	"min" numeric DEFAULT 1,
  	"max" numeric DEFAULT 5,
  	"step" numeric DEFAULT 1,
  	"show_labels" boolean DEFAULT true,
  	"min_label" varchar,
  	"max_label" varchar,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_slider_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_slider_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_ranking_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_ranking" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_ranking_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_ranking_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_checkbox_group_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_checkbox_group" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"min_select" numeric,
  	"max_select" numeric,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_checkbox_group_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_checkbox_group_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_user_profile" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"profile_field" "enum_forms_blocks_user_profile_profile_field" NOT NULL,
  	"read_only" boolean DEFAULT false,
  	"conditional_enabled" boolean DEFAULT false,
  	"conditional_action" "enum_forms_blocks_user_profile_conditional_action" DEFAULT 'show',
  	"conditional_source_field" varchar,
  	"conditional_operator" "enum_forms_blocks_user_profile_conditional_operator" DEFAULT 'equals',
  	"conditional_value" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar,
  	"subject" varchar DEFAULT 'You''ve received a new message.' NOT NULL,
  	"message" jsonb
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar,
  	"confirmation_type" "enum_forms_confirmation_type" DEFAULT 'message',
  	"confirmation_message" jsonb,
  	"redirect_url" varchar,
  	"accept_responses" boolean DEFAULT true,
  	"response_deadline" timestamp(3) with time zone,
  	"response_limit" numeric,
  	"publish_allow_multiple_submissions" boolean DEFAULT false,
  	"closed_message" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions_submission_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"user_id" integer,
  	"single_submission_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"events_id" integer,
  	"groups_id" integer,
  	"registrations_id" integer,
  	"form_assignments_id" integer,
  	"attendings_id" integer,
  	"team_members_id" integer,
  	"tags_id" integer,
  	"feature_requests_id" integer,
  	"forms_id" integer,
  	"form_submissions_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_content_hero_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "home_content_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kicker" varchar,
  	"heading" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"image_url" varchar
  );
  
  CREATE TABLE "home_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar,
  	"hero_heading" varchar,
  	"hero_subheading" varchar,
  	"hero_lead" varchar,
  	"hero_image_url" varchar,
  	"labels_member_stat" varchar,
  	"labels_session_stat" varchar,
  	"labels_advisor_stat" varchar,
  	"labels_pending_heading" varchar,
  	"labels_upcoming_heading" varchar,
  	"labels_past_heading" varchar,
  	"labels_past_link" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "terms_content_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar NOT NULL
  );
  
  CREATE TABLE "terms_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"intro" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar,
  	"short_name" varchar,
  	"meta_description" varchar,
  	"enable_i18n" boolean DEFAULT true,
  	"show_sample_data" boolean DEFAULT false,
  	"enable_password_reset" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_social_media" ADD CONSTRAINT "users_social_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_portfolio" ADD CONSTRAINT "users_portfolio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_department_id_tags_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_academic_track_id_tags_id_fk" FOREIGN KEY ("academic_track_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_academic_year_id_tags_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_groups_fk" FOREIGN KEY ("groups_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_event_type_id_tags_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_department_id_tags_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_location_id_tags_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_subscription_form_id_forms_id_fk" FOREIGN KEY ("subscription_form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_loa_form_id_forms_id_fk" FOREIGN KEY ("loa_form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_reflection_form_id_forms_id_fk" FOREIGN KEY ("reflection_form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_groups_fk" FOREIGN KEY ("groups_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "groups" ADD CONSTRAINT "groups_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "groups_rels" ADD CONSTRAINT "groups_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "groups_rels" ADD CONSTRAINT "groups_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_selected_by_id_users_id_fk" FOREIGN KEY ("selected_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_assignments" ADD CONSTRAINT "form_assignments_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendings" ADD CONSTRAINT "attendings_title_id_tags_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendings" ADD CONSTRAINT "attendings_specialty_id_tags_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox" ADD CONSTRAINT "forms_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_email" ADD CONSTRAINT "forms_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_message" ADD CONSTRAINT "forms_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_number" ADD CONSTRAINT "forms_blocks_number_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select_options" ADD CONSTRAINT "forms_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_select" ADD CONSTRAINT "forms_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_text" ADD CONSTRAINT "forms_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_textarea" ADD CONSTRAINT "forms_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_radio_options" ADD CONSTRAINT "forms_blocks_radio_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_radio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_radio" ADD CONSTRAINT "forms_blocks_radio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_date" ADD CONSTRAINT "forms_blocks_date_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_slider" ADD CONSTRAINT "forms_blocks_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_ranking_options" ADD CONSTRAINT "forms_blocks_ranking_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_ranking"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_ranking" ADD CONSTRAINT "forms_blocks_ranking_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox_group_options" ADD CONSTRAINT "forms_blocks_checkbox_group_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_checkbox_group"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_checkbox_group" ADD CONSTRAINT "forms_blocks_checkbox_group_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_user_profile" ADD CONSTRAINT "forms_blocks_user_profile_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions_submission_data" ADD CONSTRAINT "form_submissions_submission_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_groups_fk" FOREIGN KEY ("groups_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registrations_fk" FOREIGN KEY ("registrations_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_assignments_fk" FOREIGN KEY ("form_assignments_id") REFERENCES "public"."form_assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendings_fk" FOREIGN KEY ("attendings_id") REFERENCES "public"."attendings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feature_requests_fk" FOREIGN KEY ("feature_requests_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_content_hero_ctas" ADD CONSTRAINT "home_content_hero_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_content_sections" ADD CONSTRAINT "home_content_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "terms_content_sections" ADD CONSTRAINT "terms_content_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."terms_content"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_social_media_order_idx" ON "users_social_media" USING btree ("_order");
  CREATE INDEX "users_social_media_parent_id_idx" ON "users_social_media" USING btree ("_parent_id");
  CREATE INDEX "users_portfolio_order_idx" ON "users_portfolio" USING btree ("_order");
  CREATE INDEX "users_portfolio_parent_id_idx" ON "users_portfolio" USING btree ("_parent_id");
  CREATE INDEX "users_department_idx" ON "users" USING btree ("department_id");
  CREATE INDEX "users_google_id_idx" ON "users" USING btree ("google_id");
  CREATE INDEX "users_academic_academic_track_idx" ON "users" USING btree ("academic_track_id");
  CREATE INDEX "users_academic_academic_year_idx" ON "users" USING btree ("academic_year_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_groups_id_idx" ON "users_rels" USING btree ("groups_id");
  CREATE INDEX "users_rels_tags_id_idx" ON "users_rels" USING btree ("tags_id");
  CREATE INDEX "events_event_type_idx" ON "events" USING btree ("event_type_id");
  CREATE INDEX "events_department_idx" ON "events" USING btree ("department_id");
  CREATE INDEX "events_location_idx" ON "events" USING btree ("location_id");
  CREATE INDEX "events_subscription_form_idx" ON "events" USING btree ("subscription_form_id");
  CREATE INDEX "events_loa_form_idx" ON "events" USING btree ("loa_form_id");
  CREATE INDEX "events_reflection_form_idx" ON "events" USING btree ("reflection_form_id");
  CREATE INDEX "events_owner_idx" ON "events" USING btree ("owner_id");
  CREATE INDEX "events_coordinator_idx" ON "events" USING btree ("coordinator_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_groups_id_idx" ON "events_rels" USING btree ("groups_id");
  CREATE UNIQUE INDEX "groups_slug_idx" ON "groups" USING btree ("slug");
  CREATE UNIQUE INDEX "groups_tag_idx" ON "groups" USING btree ("tag_id");
  CREATE INDEX "groups_updated_at_idx" ON "groups" USING btree ("updated_at");
  CREATE INDEX "groups_created_at_idx" ON "groups" USING btree ("created_at");
  CREATE INDEX "groups_rels_order_idx" ON "groups_rels" USING btree ("order");
  CREATE INDEX "groups_rels_parent_idx" ON "groups_rels" USING btree ("parent_id");
  CREATE INDEX "groups_rels_path_idx" ON "groups_rels" USING btree ("path");
  CREATE INDEX "groups_rels_users_id_idx" ON "groups_rels" USING btree ("users_id");
  CREATE INDEX "registrations_event_idx" ON "registrations" USING btree ("event_id");
  CREATE INDEX "registrations_user_idx" ON "registrations" USING btree ("user_id");
  CREATE INDEX "registrations_submission_idx" ON "registrations" USING btree ("submission_id");
  CREATE INDEX "registrations_selected_by_idx" ON "registrations" USING btree ("selected_by_id");
  CREATE INDEX "registrations_updated_at_idx" ON "registrations" USING btree ("updated_at");
  CREATE INDEX "registrations_created_at_idx" ON "registrations" USING btree ("created_at");
  CREATE INDEX "form_assignments_form_idx" ON "form_assignments" USING btree ("form_id");
  CREATE INDEX "form_assignments_user_idx" ON "form_assignments" USING btree ("user_id");
  CREATE INDEX "form_assignments_assigned_by_idx" ON "form_assignments" USING btree ("assigned_by_id");
  CREATE INDEX "form_assignments_submission_idx" ON "form_assignments" USING btree ("submission_id");
  CREATE INDEX "form_assignments_updated_at_idx" ON "form_assignments" USING btree ("updated_at");
  CREATE INDEX "form_assignments_created_at_idx" ON "form_assignments" USING btree ("created_at");
  CREATE INDEX "attendings_title_idx" ON "attendings" USING btree ("title_id");
  CREATE INDEX "attendings_specialty_idx" ON "attendings" USING btree ("specialty_id");
  CREATE INDEX "attendings_updated_at_idx" ON "attendings" USING btree ("updated_at");
  CREATE INDEX "attendings_created_at_idx" ON "attendings" USING btree ("created_at");
  CREATE INDEX "team_members_user_idx" ON "team_members" USING btree ("user_id");
  CREATE INDEX "team_members_updated_at_idx" ON "team_members" USING btree ("updated_at");
  CREATE INDEX "team_members_created_at_idx" ON "team_members" USING btree ("created_at");
  CREATE INDEX "tags_kind_idx" ON "tags" USING btree ("kind");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_parent_idx" ON "tags" USING btree ("parent_id");
  CREATE INDEX "tags_sort_order_idx" ON "tags" USING btree ("sort_order");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "feature_requests_submitted_by_idx" ON "feature_requests" USING btree ("submitted_by_id");
  CREATE INDEX "feature_requests_updated_at_idx" ON "feature_requests" USING btree ("updated_at");
  CREATE INDEX "feature_requests_created_at_idx" ON "feature_requests" USING btree ("created_at");
  CREATE INDEX "forms_blocks_checkbox_order_idx" ON "forms_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_parent_id_idx" ON "forms_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_path_idx" ON "forms_blocks_checkbox" USING btree ("_path");
  CREATE INDEX "forms_blocks_email_order_idx" ON "forms_blocks_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_email_parent_id_idx" ON "forms_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_email_path_idx" ON "forms_blocks_email" USING btree ("_path");
  CREATE INDEX "forms_blocks_message_order_idx" ON "forms_blocks_message" USING btree ("_order");
  CREATE INDEX "forms_blocks_message_parent_id_idx" ON "forms_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_message_path_idx" ON "forms_blocks_message" USING btree ("_path");
  CREATE INDEX "forms_blocks_number_order_idx" ON "forms_blocks_number" USING btree ("_order");
  CREATE INDEX "forms_blocks_number_parent_id_idx" ON "forms_blocks_number" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_number_path_idx" ON "forms_blocks_number" USING btree ("_path");
  CREATE INDEX "forms_blocks_select_options_order_idx" ON "forms_blocks_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_options_parent_id_idx" ON "forms_blocks_select_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_order_idx" ON "forms_blocks_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_parent_id_idx" ON "forms_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_path_idx" ON "forms_blocks_select" USING btree ("_path");
  CREATE INDEX "forms_blocks_text_order_idx" ON "forms_blocks_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_text_parent_id_idx" ON "forms_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_text_path_idx" ON "forms_blocks_text" USING btree ("_path");
  CREATE INDEX "forms_blocks_textarea_order_idx" ON "forms_blocks_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_textarea_parent_id_idx" ON "forms_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_textarea_path_idx" ON "forms_blocks_textarea" USING btree ("_path");
  CREATE INDEX "forms_blocks_radio_options_order_idx" ON "forms_blocks_radio_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_radio_options_parent_id_idx" ON "forms_blocks_radio_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_radio_order_idx" ON "forms_blocks_radio" USING btree ("_order");
  CREATE INDEX "forms_blocks_radio_parent_id_idx" ON "forms_blocks_radio" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_radio_path_idx" ON "forms_blocks_radio" USING btree ("_path");
  CREATE INDEX "forms_blocks_date_order_idx" ON "forms_blocks_date" USING btree ("_order");
  CREATE INDEX "forms_blocks_date_parent_id_idx" ON "forms_blocks_date" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_date_path_idx" ON "forms_blocks_date" USING btree ("_path");
  CREATE INDEX "forms_blocks_slider_order_idx" ON "forms_blocks_slider" USING btree ("_order");
  CREATE INDEX "forms_blocks_slider_parent_id_idx" ON "forms_blocks_slider" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_slider_path_idx" ON "forms_blocks_slider" USING btree ("_path");
  CREATE INDEX "forms_blocks_ranking_options_order_idx" ON "forms_blocks_ranking_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_ranking_options_parent_id_idx" ON "forms_blocks_ranking_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_ranking_order_idx" ON "forms_blocks_ranking" USING btree ("_order");
  CREATE INDEX "forms_blocks_ranking_parent_id_idx" ON "forms_blocks_ranking" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_ranking_path_idx" ON "forms_blocks_ranking" USING btree ("_path");
  CREATE INDEX "forms_blocks_checkbox_group_options_order_idx" ON "forms_blocks_checkbox_group_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_group_options_parent_id_idx" ON "forms_blocks_checkbox_group_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_group_order_idx" ON "forms_blocks_checkbox_group" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_group_parent_id_idx" ON "forms_blocks_checkbox_group" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_group_path_idx" ON "forms_blocks_checkbox_group" USING btree ("_path");
  CREATE INDEX "forms_blocks_user_profile_order_idx" ON "forms_blocks_user_profile" USING btree ("_order");
  CREATE INDEX "forms_blocks_user_profile_parent_id_idx" ON "forms_blocks_user_profile" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_user_profile_path_idx" ON "forms_blocks_user_profile" USING btree ("_path");
  CREATE INDEX "forms_emails_order_idx" ON "forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "forms_emails" USING btree ("_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE INDEX "form_submissions_submission_data_order_idx" ON "form_submissions_submission_data" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_data_parent_id_idx" ON "form_submissions_submission_data" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_user_idx" ON "form_submissions" USING btree ("user_id");
  CREATE UNIQUE INDEX "form_submissions_single_submission_key_idx" ON "form_submissions" USING btree ("single_submission_key");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("groups_id");
  CREATE INDEX "payload_locked_documents_rels_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("registrations_id");
  CREATE INDEX "payload_locked_documents_rels_form_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("form_assignments_id");
  CREATE INDEX "payload_locked_documents_rels_attendings_id_idx" ON "payload_locked_documents_rels" USING btree ("attendings_id");
  CREATE INDEX "payload_locked_documents_rels_team_members_id_idx" ON "payload_locked_documents_rels" USING btree ("team_members_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_feature_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("feature_requests_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_content_hero_ctas_order_idx" ON "home_content_hero_ctas" USING btree ("_order");
  CREATE INDEX "home_content_hero_ctas_parent_id_idx" ON "home_content_hero_ctas" USING btree ("_parent_id");
  CREATE INDEX "home_content_sections_order_idx" ON "home_content_sections" USING btree ("_order");
  CREATE INDEX "home_content_sections_parent_id_idx" ON "home_content_sections" USING btree ("_parent_id");
  CREATE INDEX "terms_content_sections_order_idx" ON "terms_content_sections" USING btree ("_order");
  CREATE INDEX "terms_content_sections_parent_id_idx" ON "terms_content_sections" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_social_media" CASCADE;
  DROP TABLE "users_portfolio" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "groups" CASCADE;
  DROP TABLE "groups_rels" CASCADE;
  DROP TABLE "registrations" CASCADE;
  DROP TABLE "form_assignments" CASCADE;
  DROP TABLE "attendings" CASCADE;
  DROP TABLE "team_members" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "feature_requests" CASCADE;
  DROP TABLE "forms_blocks_checkbox" CASCADE;
  DROP TABLE "forms_blocks_email" CASCADE;
  DROP TABLE "forms_blocks_message" CASCADE;
  DROP TABLE "forms_blocks_number" CASCADE;
  DROP TABLE "forms_blocks_select_options" CASCADE;
  DROP TABLE "forms_blocks_select" CASCADE;
  DROP TABLE "forms_blocks_text" CASCADE;
  DROP TABLE "forms_blocks_textarea" CASCADE;
  DROP TABLE "forms_blocks_radio_options" CASCADE;
  DROP TABLE "forms_blocks_radio" CASCADE;
  DROP TABLE "forms_blocks_date" CASCADE;
  DROP TABLE "forms_blocks_slider" CASCADE;
  DROP TABLE "forms_blocks_ranking_options" CASCADE;
  DROP TABLE "forms_blocks_ranking" CASCADE;
  DROP TABLE "forms_blocks_checkbox_group_options" CASCADE;
  DROP TABLE "forms_blocks_checkbox_group" CASCADE;
  DROP TABLE "forms_blocks_user_profile" CASCADE;
  DROP TABLE "forms_emails" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "form_submissions_submission_data" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home_content_hero_ctas" CASCADE;
  DROP TABLE "home_content_sections" CASCADE;
  DROP TABLE "home_content" CASCADE;
  DROP TABLE "terms_content_sections" CASCADE;
  DROP TABLE "terms_content" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_users_portfolio_year";
  DROP TYPE "public"."enum_events_status_override";
  DROP TYPE "public"."enum_groups_type";
  DROP TYPE "public"."enum_registrations_status";
  DROP TYPE "public"."enum_tags_kind";
  DROP TYPE "public"."enum_feature_requests_type";
  DROP TYPE "public"."enum_feature_requests_status";
  DROP TYPE "public"."enum_forms_blocks_checkbox_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_checkbox_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_email_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_email_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_message_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_message_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_number_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_number_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_select_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_select_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_text_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_text_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_textarea_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_textarea_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_radio_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_radio_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_date_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_date_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_slider_variant";
  DROP TYPE "public"."enum_forms_blocks_slider_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_slider_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_ranking_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_ranking_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_checkbox_group_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_checkbox_group_conditional_operator";
  DROP TYPE "public"."enum_forms_blocks_user_profile_profile_field";
  DROP TYPE "public"."enum_forms_blocks_user_profile_conditional_action";
  DROP TYPE "public"."enum_forms_blocks_user_profile_conditional_operator";
  DROP TYPE "public"."enum_forms_confirmation_type";`)
}

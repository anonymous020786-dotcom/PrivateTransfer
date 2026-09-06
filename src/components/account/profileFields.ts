// 31 editable profile fields, grouped. Stored in Supabase user_metadata.
export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'email'
  | 'tel'
  | 'url'

export type ProfileField = {
  key: string
  label: string
  type: FieldType
  group: string
  options?: string[]
  half?: boolean
}

export const PROFILE_FIELDS: ProfileField[] = [
  // Personal
  {
    key: 'first_name',
    label: 'First name',
    type: 'text',
    group: 'Personal',
    half: true,
  },
  {
    key: 'last_name',
    label: 'Last name',
    type: 'text',
    group: 'Personal',
    half: true,
  },
  { key: 'full_name', label: 'Display name', type: 'text', group: 'Personal' },
  {
    key: 'username',
    label: 'Username',
    type: 'text',
    group: 'Personal',
    half: true,
  },
  {
    key: 'pronouns',
    label: 'Pronouns',
    type: 'text',
    group: 'Personal',
    half: true,
  },
  { key: 'headline', label: 'Headline', type: 'text', group: 'Personal' },
  { key: 'bio', label: 'Bio', type: 'textarea', group: 'Personal' },
  {
    key: 'date_of_birth',
    label: 'Date of birth',
    type: 'date',
    group: 'Personal',
    half: true,
  },
  {
    key: 'gender',
    label: 'Gender',
    type: 'select',
    group: 'Personal',
    half: true,
    options: ['', 'Female', 'Male', 'Non-binary', 'Prefer not to say'],
  },

  // Contact
  { key: 'phone', label: 'Phone', type: 'tel', group: 'Contact', half: true },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    type: 'tel',
    group: 'Contact',
    half: true,
  },
  {
    key: 'backup_email',
    label: 'Backup email',
    type: 'email',
    group: 'Contact',
    half: true,
  },
  {
    key: 'website',
    label: 'Website',
    type: 'url',
    group: 'Contact',
    half: true,
  },

  // Location
  {
    key: 'country',
    label: 'Country',
    type: 'text',
    group: 'Location',
    half: true,
  },
  {
    key: 'state',
    label: 'State / Region',
    type: 'text',
    group: 'Location',
    half: true,
  },
  { key: 'city', label: 'City', type: 'text', group: 'Location', half: true },
  {
    key: 'postal_code',
    label: 'Postal code',
    type: 'text',
    group: 'Location',
    half: true,
  },
  { key: 'address_line', label: 'Address', type: 'text', group: 'Location' },
  {
    key: 'timezone',
    label: 'Timezone',
    type: 'text',
    group: 'Location',
    half: true,
  },
  {
    key: 'language',
    label: 'Preferred language',
    type: 'text',
    group: 'Location',
    half: true,
  },

  // Professional
  {
    key: 'company',
    label: 'Company',
    type: 'text',
    group: 'Professional',
    half: true,
  },
  {
    key: 'job_title',
    label: 'Job title',
    type: 'text',
    group: 'Professional',
    half: true,
  },
  {
    key: 'department',
    label: 'Department',
    type: 'text',
    group: 'Professional',
    half: true,
  },
  {
    key: 'industry',
    label: 'Industry',
    type: 'text',
    group: 'Professional',
    half: true,
  },
  {
    key: 'years_experience',
    label: 'Years of experience',
    type: 'text',
    group: 'Professional',
    half: true,
  },
  {
    key: 'skills',
    label: 'Skills (comma separated)',
    type: 'text',
    group: 'Professional',
  },

  // Social
  {
    key: 'twitter',
    label: 'Twitter / X',
    type: 'url',
    group: 'Social',
    half: true,
  },
  { key: 'github', label: 'GitHub', type: 'url', group: 'Social', half: true },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    group: 'Social',
    half: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    type: 'url',
    group: 'Social',
    half: true,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    type: 'url',
    group: 'Social',
    half: true,
  },
]

export const PROFILE_GROUPS = [
  'Personal',
  'Contact',
  'Location',
  'Professional',
  'Social',
]

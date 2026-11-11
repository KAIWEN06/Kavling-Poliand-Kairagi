# PoliLand Kairagi Design System

## 1. Project Overview

PoliLand Mobile is a Vue 3 and Ionic Vue application built with TypeScript, Tailwind CSS 4, Supabase, and Capacitor. The application serves five role contexts:

- Public
- Client
- Marketing
- Admin
- Supervisor

The shared foundation provides consistent typography, colors, and interaction patterns. It does not require each role to use the same layout or navigation structure.

## 2. Design Principles

- Preserve role-specific workflows and navigation.
- Use semantic tokens before hardcoded values.
- Keep Ionic, Tailwind, and application CSS connected to the same source of truth.
- Preserve existing legacy aliases until every reference has been mapped.
- Prefer native controls and visible interaction states.
- Meet WCAG AA contrast requirements.
- Keep the interface usable at mobile widths and with safe-area insets.

## 2.1 Bahasa dan Terminologi UI

- Gunakan Bahasa Indonesia yang konsisten untuk teks antarmuka pengguna.
- Hindari istilah bahasa Inggris jika padanan Indonesia yang jelas tersedia.
- Gunakan “Disematkan” untuk status/filter catatan yang dipasang di bagian atas.
- Gunakan “Sematkan” untuk aksi memasang catatan dan “Lepas sematan” untuk aksi membatalkannya.
- Nama field database, properti TypeScript, dan API internal boleh tetap menggunakan istilah teknis aslinya.

## 3. Visual Direction

The PoliLand visual direction is Modern-Natural, combining brand green and gold with warm neutral surfaces. Brand green is the primary operational color. Gold is an accent and may be used as a surface or icon accent. Gold used for small text must use an accessible gold text token.

The visual foundation is currently implemented in `src/theme/variables.css` and `src/styles/main.css`.

## 4. Typography

The primary typeface is Plus Jakarta Sans, loaded through Fontsource in `src/main.ts`.

Available weights:

| Weight | Token                     |
| ------ | ------------------------- |
| 400    | `--font-weight-regular`   |
| 500    | `--font-weight-medium`    |
| 600    | `--font-weight-semibold`  |
| 700    | `--font-weight-bold`      |
| 800    | `--font-weight-extrabold` |

Font tokens:

- `--font-primary`
- `--font-sans` in Tailwind
- `--ion-font-family`

`--font-primary`, `--font-sans`, and `--ion-font-family` must resolve to Plus Jakarta Sans. Ionic Shadow DOM components inherit the application font through the Ionic font variable.

## 5. Brand Colors

| Token                       | Value     | Intended usage                                |
| --------------------------- | --------- | --------------------------------------------- |
| `--poliland-green`          | `#355A2C` | Primary brand and action color                |
| `--poliland-gold`           | `#CBA044` | Brand accent and graphic accent               |
| `--poliland-gold-soft`      | `#F4D69A` | Soft gold surface accent                      |
| `--poliland-gold-text`      | `#966A12` | Accessible gold text on light surfaces        |
| `--poliland-gold-text-soft` | `#805708` | Accessible deeper gold text on cream surfaces |

Brand gold must not be used as text by default. Gold used as text should use a gold text token and be contrast-tested.

## 6. Semantic Colors

| Function               | Token               | Current value               |
| ---------------------- | ------------------- | --------------------------- |
| Application background | `--app-background`  | `#FAF9F6`                   |
| Primary surface        | `--surface-primary` | `#FFFFFF`                   |
| Muted surface          | `--surface-muted`   | `#F5F3EE`                   |
| Primary text           | `--text-primary`    | `#252525`                   |
| Secondary text         | `--text-secondary`  | `#717178`                   |
| Default border         | `--border-default`  | `#EAE7E0`                   |
| Success                | `--status-success`  | Alias to `--poliland-green` |
| Warning                | `--status-warning`  | Alias to `--poliland-gold`  |
| Danger                 | `--status-danger`   | `#D94B45`                   |

Additional status surfaces include `--status-success-bg`. Ionic mappings are defined in `src/theme/variables.css` for primary, secondary, success, warning, danger, medium, card, item, and toolbar.

## 7. Color Usage Rules

- Use semantic tokens for component behavior and visual states.
- Use brand tokens only where the design intentionally communicates brand identity.
- Never use status meaning as decoration.
- Pair status colors with text or an accessible icon where users must interpret the state.
- Preserve legacy aliases. Do not remove them while references still exist.
- Do not introduce a new token when an existing semantic token has the same function.

## 8. Contrast Accessibility

Normal text must meet 4.5:1 contrast against its actual background. Large text must meet 3:1. Interactive boundaries and focus indicators should meet 3:1 against adjacent colors.

The application should not rely on color alone to communicate active, success, warning, danger, disabled, or loading states.

Every shared component must have a visible `:focus-visible` treatment. Native buttons should be used for actions and native links for navigation.

## 9. Spacing System

The project does not currently define a complete named spacing scale in CSS. Existing spacing is primarily expressed with component-specific pixel or Tailwind values.

Current recommended development rule:

- Use the existing component layout before introducing a new spacing scale.
- Reuse values consistently within a component.
- Preserve current page layout and page padding.
- Propose any named spacing tokens before implementation.

This spacing section records the current state; it does not claim tokens that do not exist.

## 10. Border Radius

| Token              | Value  |
| ------------------ | ------ |
| `--radius-control` | `12px` |
| `--radius-card`    | `16px` |
| `--radius-panel`   | `20px` |

Radius should communicate component hierarchy. It should not make every control a pill.

Existing shared components still contain literal radius values. Their standardization is a planned recommendation, not an already implemented state.

## 11. Shadow System

Shadows should communicate elevation, not act as decoration on every surface.

The project currently uses component-local shadows. A named shared elevation scale is not yet defined, so it should not be documented as implemented.

## 12. Ionic Theme Integration

Ionic theme variables in `src/theme/variables.css` are connected to PoliLand semantic and brand variables. The public application inherits global typography and background through Ionic variables and `src/styles/main.css`.

Legacy `--pl-*` variables remain aliases for compatibility. Components may continue to reference them until they are intentionally migrated.

## 13. Tailwind Integration

Tailwind's `--font-sans` token resolves to Plus Jakarta Sans. The Tailwind theme and global Ionic typography are therefore expected to use the same font family.

Semantic application colors may be used through CSS custom properties. Tailwind utility styles that duplicate a component should not bypass the component API without a documented need.

## 14. Shared Components

### AppButton

Current implementation:

- Wraps Ionic `ion-button`.
- Supports `color`, `fill`, `expand`, and `disabled`.
- Uses `@click="$emit('click')"` and a slot.
- The component is currently used for auth actions, siteplan actions, gallery calls to action, and headers.

Implemented API:

| Prop       | Type                                                   | Default                                                |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `variant`  | `primary \| secondary \| success \| danger \| neutral` | Inferred: `primary` when no legacy `color` is provided |
| `fill`     | `solid \| outline \| clear`                            | `solid`                                                |
| `size`     | `small \| medium \| large`                             | `medium`                                               |
| `expand`   | `block \| full`                                        | None                                                   |
| `loading`  | `boolean`                                              | `false`                                                |
| `disabled` | `boolean`                                              | `false`                                                |
| `type`     | `button \| submit \| reset`                            | `button`                                               |
| `color`    | Ionic-compatible color                                 | None                                                   |

The `variant` API takes priority over legacy `color`. Legacy `color` and Ionic fill values remain supported. `fill="default"` is normalized to `solid`.

#### Variants

| Variant     | Solid visual direction               |
| ----------- | ------------------------------------ |
| `primary`   | PoliLand green                       |
| `secondary` | PoliLand gold with dark primary text |
| `success`   | Semantic success green               |
| `danger`    | Semantic danger red                  |
| `neutral`   | Muted surface with primary text      |

Outline and clear fills preserve the same variant meaning while using transparent surfaces or borders.

#### States

- Default, hover, active, and focus-visible states use semantic tokens.
- Small, medium, and large buttons use 44px, 44px, and 48px minimum heights respectively.
- Loading and disabled states prevent interaction.
- Loading displays a spinner, retains slot text, and sets `aria-busy="true"` with a screen-reader processing label.

### AppInput

Shared Ionic input component for text, email, telephone, and password fields.

#### Props

Existing props:

- `modelValue`
- `label`
- `placeholder`
- `type`
- `autocomplete`
- `icon`
- `inputId`
- `required`
- `disabled`
- `showPasswordToggle`

Additional props:

- `errorMessage?: string`
- `readonly?: boolean`

#### Events

- `update:modelValue`
- `focus`
- `blur`
- `visibility-change`

#### Semantic mapping

| Element                                | Token                                  |
| -------------------------------------- | -------------------------------------- |
| Label and input text                   | `--text-primary`                       |
| Placeholder and icon                   | `--text-secondary`                     |
| Control and password button background | `--surface-primary`, `--surface-muted` |
| Border                                 | `--border-default`                     |
| Focus                                  | `--poliland-green`                     |
| Error                                  | `--status-danger`                      |
| Radius                                 | `--radius-control`                     |

#### States

- Default, hover, focus, focus-visible, disabled, read-only, and error states use semantic tokens.
- Password visibility preserves the existing hidden and visible states with an accessible toggle label and `aria-pressed`.
- Error text is also exposed through `role="alert"`.

#### Accessibility and attributes

- A supplied `inputId` is preserved.
- An omitted `inputId` receives a unique generated ID.
- Labels use the resolved input ID.
- Native attributes are forwarded to `IonInput`, including `name`, `form`, `inputmode`, length limits, pattern, and data attributes.
- `aria-invalid="true"` is set only when `errorMessage` is present.
- `errorMessage` supplies an automatically generated error ID through `aria-describedby`.
- Caller-provided `aria-describedby` IDs are combined with the generated error ID.

#### Example

```vue
<AppInput
  v-model="email"
  input-id="checkout-email"
  label="Email"
  name="email"
  type="email"
  autocomplete="email"
  required
  :error-message="emailError"
/>
```

### AppHeader

The shared header supports:

- Default, marketing, and admin variants.
- Back behavior.
- Notification navigation.
- Authentication-dependent login action.

The role appearance remains differentiated. Shared implementation uses semantic surfaces, borders, primary text, secondary text, status color, and control radius. Role-specific structure and navigation are unchanged. Interactive icon controls use a 44px minimum target, and the title uses the configured Plus Jakarta Sans weight.

### MobileTabBar

An existing shared tab bar supports public, marketing, and admin variants. Navigation structure, menu count, labels, route targets, and role access must remain distinct. Shared typography, active and inactive state, icon sizing, spacing, radius, safe area, and accessibility can be standardized.

### AppModal — Shared Modal Component

`src/components/ui/AppModal.vue` is the shared modal foundation for the application. It uses a Vue-rendered fixed overlay rather than `ion-modal`, following the visual and interaction pattern already used by the Edit Data Customer panel in `AdminPembeliDetail.vue`.

Use this component for form sheets, compact dialogs, and full-screen modal flows. Pages provide their own form content and business logic through slots; the shared component owns the overlay, panel, header, footer, transitions, focus behavior, and page scroll lock.

#### Variants

| Variant        | Intended use                            | Mobile behavior                                 | Desktop behavior                    |
| -------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `bottom-sheet` | Add, edit, and update forms             | Anchored to the bottom with rounded top corners | Centered panel, maximum width 560px |
| `dialog`       | Short confirmations and focused actions | Centered panel                                  | Centered panel                      |
| `fullscreen`   | Complex or space-intensive flows        | Fills the viewport                              | Fills the viewport                  |

#### Props

| Prop              | Type                                                   | Default        | Purpose                                             |
| ----------------- | ------------------------------------------------------ | -------------- | --------------------------------------------------- |
| `modelValue`      | `boolean`                                              | Required       | Controls visibility with `v-model`                  |
| `title`           | `string`                                               | `''`           | Visible heading and accessible dialog label         |
| `ariaLabel`       | `string`                                               | `'Dialog'`     | Accessible name when no title is supplied           |
| `variant`         | `bottom-sheet \| dialog \| fullscreen`                 | `bottom-sheet` | Modal layout                                        |
| `showHeader`      | `boolean`                                              | `true`         | Shows the header region                             |
| `showClose`       | `boolean`                                              | `true`         | Shows the close control in the default header       |
| `showDivider`     | `boolean`                                              | `true`         | Shows the divider below the header                  |
| `showFooter`      | `boolean`                                              | `true`         | Shows the footer region                             |
| `showCancel`      | `boolean`                                              | `true`         | Shows the default cancel button                     |
| `showConfirm`     | `boolean`                                              | `true`         | Shows the default confirmation button               |
| `cancelText`      | `string`                                               | `'Batal'`      | Default cancel label                                |
| `confirmText`     | `string`                                               | `'Simpan'`     | Default confirmation label                          |
| `confirmVariant`  | `primary \| secondary \| success \| danger \| neutral` | `primary`      | AppButton variant for confirmation                  |
| `loading`         | `boolean`                                              | `false`        | Disables closing and displays confirm loading state |
| `confirmDisabled` | `boolean`                                              | `false`        | Disables the confirmation button                    |
| `closeOnBackdrop` | `boolean`                                              | `true`         | Allows backdrop click to request close              |
| `closeOnEscape`   | `boolean`                                              | `true`         | Allows Escape to request close                      |
| `maxWidth`        | `string`                                               | `560px`        | Maximum panel width                                 |
| `maxHeight`       | `string`                                               | `90dvh`        | Maximum panel height                                |

#### Slots

- Default slot: modal body content.
- `header`: replaces the default title and close-control layout.
- `footer`: replaces the default cancel and confirm buttons.

When a custom footer is supplied, the page is responsible for its button actions and loading/disabled presentation.

#### Events

| Event               | Payload                                        | Behavior                                                |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `update:modelValue` | `boolean`                                      | Supports `v-model` visibility                           |
| `confirm`           | none                                           | Emitted when the default confirmation button is clicked |
| `cancel`            | none                                           | Emitted when the default cancel button is clicked       |
| `close`             | `close-button \| cancel \| backdrop \| escape` | Reports why a close was requested                       |

The component does not own form submission or data persistence. The parent page handles validation, API/Supabase operations, success notifications, and error messages. Keep the modal open when saving fails.

#### Usage example

```vue
<AppModal
  v-model="editModalOpen"
  title="Edit data customer"
  variant="bottom-sheet"
  :loading="saving"
  confirm-text="Simpa"
  @confirm="saveCustomer"
>
  <form class="customer-form" @submit.prevent="saveCustomer">
    <!-- Page-specific fields -->
  </form>
</AppModal>
```

For forms that use native form submission, prefer a custom footer slot and a submit button associated with the form, or keep the submit action in the body. Do not nest a `<form>` inside another `<form>`.

A confirmation dialog can use:

```vue
<AppModal
  v-model="deleteModalOpen"
  title="Hapus data?"
  variant="dialog"
  confirm-text="Hapus"
  confirm-variant="danger"
  @confirm="deleteRecord"
>
  Yakin ingin menghapus data ini?
</AppModal>
```

#### Visual rules

- Use the existing semantic tokens: `--surface-primary`, `--surface-muted`, `--text-primary`, `--border-default`, `--radius-panel`, `--radius-control`, and `--poliland-green`.
- Bottom sheet mobile layout is full width, anchored to the viewport bottom, with top corners using `--radius-panel`.
- Header title uses Plus Jakarta Sans, 18–20px, semibold or bold.
- Close control has a minimum 44 × 44px touch target.
- Body is the only scrollable region when content exceeds available height.
- Default footer uses two equal-width actions with a minimum 44px touch target.
- Footer accounts for `env(safe-area-inset-bottom)`.
- Desktop bottom sheets become centered panels with a maximum width of 560px.
- Reduced-motion preferences must be respected.
- Avoid page-specific copies of overlay, panel, header, footer, transition, or backdrop CSS.

#### Behavior and accessibility

- The component locks background page scrolling while open and restores the previous body styles on close.
- Focus moves into the dialog when opened, remains trapped while navigating with Tab, and returns to the previously focused element when closed.
- Escape and backdrop interactions request closing according to their respective props.
- Closing is blocked while `loading` is true.
- Every modal must have an accessible name through `title` or `ariaLabel`.
- Form labels, field validation, and error descriptions remain the responsibility of the page and its form controls.
- The parent page must handle unsaved-change confirmation when necessary; do not silently discard a dirty form.
- Do not put business logic, Supabase queries, routing, or page-specific field definitions inside `AppModal.vue`.

#### Migration rule

Use `AppModal` for new modal work. Migrate existing modals incrementally after checking their current behavior. Do not migrate all pages in one change, and do not remove an existing implementation until the replacement has been tested on mobile and desktop.

## 15. Role-specific UI Rules

The five roles share:

- Typography.
- Semantic tokens.
- Component APIs.
- Accessibility requirements.
- Responsive rules.

The roles do not share:

- All navigation menus.
- All page layouts.
- All role-specific workflows.
- All action density or administrative data views.

Public, marketing, admin, client, and supervisor differences must remain intentional and content-driven.

## 16. Responsive Rules

- Preserve the minimum 320px application width.
- Use `env(safe-area-inset-bottom)` for fixed bottom navigation.
- Interactive controls should have at least a 44px touch target.
- Navigation labels must not clip or escape their grid cell.
- Fixed components must avoid covering page actions.
- Test narrow widths before claiming a responsive improvement.

## 17. Accessibility Guidelines

- Every action uses a native button or equivalent accessible element.
- Every navigation item has a real destination.
- Every icon-only control has an accessible name.
- Every input has a visible label associated with its control.
- Dialogs support Escape and keyboard focus handling.
- Formulir tambah/edit/ubah data mengikuti standar `AppFormSheet`; jangan membuat pola modal formulir yang berbeda per halaman atau role.
- Loading, empty, and error states provide visible and accessible context.
- Status must use text or an icon in addition to color.
- Reduced motion must be respected where transitions are added.

## 18. Legacy Token Rules

Legacy PoliLand tokens remain aliases while existing code still references them.

Examples:

- `--pl-charcoal` aliases `--text-primary`.
- `--pl-gray` aliases `--text-secondary`.
- `--pl-background` aliases `--app-background`.
- `--pl-surface` aliases `--surface-primary`.
- `--pl-success` aliases `--status-success`.

Do not remove a legacy token until its references have been mapped and migrated. Do not create a new alias with the same function as an existing semantic token.

## 19. Component Implementation Guidelines

- Complete an audit before creating a shared component.
- Preserve existing props, native attributes, events, navigation, and form behavior.
- Do not change routes, Supabase queries, database access, or business logic.
- Do not change page layout when standardizing a component.
- Semua alur tambah/edit/ubah data yang menggunakan formulir harus memakai `AppFormSheet` sesuai bagian Shared Components.
- Keep role variants separate when users need different workflows.
- Add or change a token only when the existing tokens cannot represent the state.
- Run production build, TypeScript validation, and `git diff --check`.

## 20. Phase 2 Audit Findings and Recommendations

### AppButton

Recommendations:

- Finalize a single visual API with explicit priority rules.
- Keep backward-compatible Ionic properties.
- Add a semantic `variant` only after existing callers are classified.
- Add size, loading, and native attribute forwarding deliberately.

Existing use that needs review includes `DetailPanel.vue`, where `variant="secondary"` is currently forwarded as an undeclared attribute and no wrapper variant is implemented.

### ContactPage

The location card button has no event handler at [ContactPage.vue](/C:/Users/Kevin/Desktop/Kavling-PoliLand-Kairagi-v2/poliland-mobile/src/views/ContactPage.vue:103). The page already defines real link cards for WhatsApp and telephone, but the stored values are placeholders at [ContactPage.vue](/C:/Users/Kevin/Desktop/Kavling-PoliLand-Kairagi-v2/poliland-mobile/src/views/ContactPage.vue:188).

The recommended action cannot be selected until the owner provides the real contact source and destination. The location button should either navigate to or trigger an approved existing WhatsApp or telephone contact flow.

### AppInput

This component is implemented with the semantic mapping documented above. Remaining AppHeader and MobileTabBar work is outside the current implementation scope.

### AppHeader

Recommended token mapping:

| Existing style          | Recommended token                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Toolbar background      | `--surface-muted` or existing cream background rule if role appearance requires it |
| Toolbar border          | `--border-default`                                                                 |
| Primary text and icons  | `--text-primary`                                                                   |
| Secondary label text    | `--text-secondary`                                                                 |
| Notification dot        | `--status-danger`                                                                  |
| Notification dot border | Surface and toolbar background                                                     |

### MobileTabBar

The three variants remain separate:

| Variant   | Current menu purpose                             |
| --------- | ------------------------------------------------ |
| Public    | Home, siteplan, progress, gallery, contact       |
| Marketing | Home, kavling, potential buyers, follow-up, more |
| Admin     | Home, kavling, buyers, finance, more             |

Shared recommendations are semantic colors, identical icon sizing, consistent labels, 44px minimum interaction targets, visible active state, visible focus, safe-area handling, and Plus Jakarta Sans.

Role structure, route targets, labels, and menu count should not be merged.

Phase 2.3 standardizes the shared foundation while preserving these role menus:

- Semantic primary surfaces and border colors replace the previous opaque glass and gradient treatment.
- Active items use the brand green and a stable icon surface instead of elevation and decorative vertical movement.
- Labels use Plus Jakarta Sans and the shared extra-small size.
- `:focus-visible` has an explicit 3px brand-green focus indicator.
- Active state is not communicated by motion alone. It combines color, icon background, label weight, and an active indicator.
- Safe-area inset, fixed positioning, route behavior, detail/search hiding, and role menu configuration remain unchanged.

### ContactPage

`ContactPage.vue` loads verified availability from `contactService.getContacts()`, which reads the `contacts` table in Supabase. It does not generate placeholder contact values.

Supported source keys include:

- WhatsApp: `whatsapp`, `whatsapp_number`
- Telephone: `phone`, `telephone`, `telepon`
- Email: `email`
- Address: `address`, `alamat`
- Map link: `maps_url`, `map_url`, `location_url`
- Social profiles: `instagram`, `instagram_url`, `facebook`, `facebook_url`, `tiktok`, `tiktok_url`

The page renders loading, unavailable, and loading-error states. Contact and social cards are rendered only when their stored values are usable. A telephone link is created only for a stored telephone value. A WhatsApp link is created only when a stored number can be normalized. Email is shown only when a stored email value is available.

Social profile values must be complete HTTP or HTTPS URLs. Addresses become a Google Maps search only when a `maps_url` is not stored. If neither a valid map URL nor address is available, the location card does not render a dead action.

## 21. Data Integrity & Activity Audit Rules

### 21.1 General Audit Requirements

Every successful data mutation performed through the application must be recorded when the entity is covered by an activity audit system.

The application must maintain reliable audit records for:

- INSERT: New records created.
- UPDATE: Existing records modified.
- DELETE: Records permanently deleted.
- Relevant file operations, including upload, replacement, and deletion.

Audit records must reflect successful database operations only. Failed, rejected, cancelled, or rolled-back operations must not produce successful activity records.

### 21.2 Lot Activity Audit — PoliLand

The `lots` table must use `public.lot_activity_logs` as its audit history source.

Every successful INSERT, UPDATE, and DELETE operation on `public.lots` must be recorded automatically through PostgreSQL triggers.

Do not rely exclusively on frontend code to create audit records. Database-level triggers must be the primary source of truth for lot data changes.

#### INSERT Rules

When a new lot is created:

- Record the action as `INSERT`.
- Record the authenticated user's ID.
- Record the new lot ID and lot number.
- Preserve the complete new record in `new_value`.
- Record the creation timestamp.
- Do not create a log if the transaction fails or rolls back.

#### UPDATE Rules

When an existing lot is updated:

- Record the action as `UPDATE`.
- Detect actual field-level changes using `IS DISTINCT FROM`.
- Ignore fields whose values have not changed.
- Store the previous value in `old_value`.
- Store the updated value in `new_value`.
- Store the affected column in `field_name`.
- Record the authenticated user's ID.
- Record the lot ID, lot number, and timestamp.
- Multiple changed fields may produce multiple audit entries for one update operation.

The following lot fields must be monitored:

- `lot_number`
- `polygon_id`
- `block_id`
- `dimension`
- `area`
- `cash_price`
- `promo_price`
- `status`
- `payment_type`
- `customer_id`
- `booking_date`
- `sold_date`
- `color`
- `description`
- `panorama_url`
- `panorama_boundary`

All new business-related fields added to `lots` must be evaluated and included in the audit configuration when relevant.

#### DELETE Rules

When a lot is permanently deleted:

- Record the action as `DELETE`.
- Preserve the complete deleted record in `old_value`.
- Store the deleted lot ID and lot number in `metadata`.
- Record the authenticated user's ID.
- Preserve the audit record after the original lot is deleted.
- Use `ON DELETE SET NULL` for the `lot_id` foreign key so deleting a lot does not delete its audit history.

Never cascade-delete lot audit records when deleting a lot.

### 21.3 Authenticated User Attribution

Every audit entry must identify the user responsible for the operation whenever an authenticated user context is available.

Use Supabase Auth `auth.uid()` as the authoritative source of the acting user's ID.

Rules:

- Never accept the acting user's ID directly from an untrusted frontend payload.
- Do not use a hardcoded user ID.
- Do not infer the actor from the lot owner, customer, or marketing assignment.
- Store the actor in `lot_activity_logs.user_id`.
- Resolve the actor's display name from `public.profiles` when displaying the history.
- Handle missing or deleted profiles without breaking the history display.

Operations executed through service-role credentials or background processes without a user authentication context must not be falsely attributed to an Admin. Their actor may be NULL or identified through a separately documented system-actor mechanism.

### 21.4 Excluded Transaction Events

The lot activity history must not duplicate the dedicated transaction history.

The following transaction-related events must remain in their respective transaction records and must not be presented as ordinary lot data changes:

- Booking creation and cancellation.
- Payment creation and confirmation.
- Installment payment updates.
- Sale completion.
- Transaction cancellation.
- Customer payment status changes.

If these processes update fields in `lots`, the audit implementation must distinguish transaction-driven changes from ordinary administrative edits.

Do not silently exclude all `status` changes. Preserve legitimate administrative status changes and document how transaction-driven changes are identified.

### 21.5 Panorama and Storage Audit

Each lot has one 360-degree panorama referenced by `lots.panorama_url`.

Panorama operations must be audited:

- First panorama upload.
- Panorama replacement.
- Panorama deletion.
- Panorama boundary changes.

Rules:

- A successful upload must be followed by a successful database update of `panorama_url`.
- Use a unique Storage object path when replacing a panorama so that the new file can be distinguished from the previous file.
- Record the old and new panorama references.
- Clear `panorama_url` when a panorama is removed.
- Do not delete the previous file until the database update succeeds.
- If the database update fails after uploading a new file, perform appropriate cleanup or retain the file for recovery.
- If Storage deletion fails, do not report the entire deletion workflow as successful.
- Do not assume PostgreSQL triggers on `lots` automatically detect file changes in Supabase Storage.

Storage operations must be coordinated through an application service or another explicitly implemented audit mechanism.

### 21.6 Audit Reliability and Atomicity

Audit logging must be reliable and consistent.

Rules:

- Use PostgreSQL triggers for database-level lot auditing.
- Audit insertion must occur in the same database transaction as the original lot operation.
- If audit insertion fails, the corresponding lot mutation must fail rather than silently losing the audit record.
- Do not catch and suppress audit insertion errors.
- Do not create duplicate audit entries through simultaneous frontend and database-trigger logging.
- Do not allow ordinary authenticated users to directly INSERT, UPDATE, or DELETE audit records.
- Restrict audit table access through appropriate Supabase grants and Row Level Security policies.
- Ensure trigger functions use a controlled `search_path` and appropriately restricted ownership and privileges.
- Review foreign key behavior so audit records survive lot deletion.

### 21.7 Audit History Display

The Admin lot detail page must display audit records in the `Riwayat Perubahan` tab.

The history interface must:

- Display the acting user's name.
- Display the action type.
- Display the affected field when applicable.
- Display old and new values in a human-readable format.
- Display the date and time.
- Support INSERT, UPDATE, and DELETE records.
- Display deleted lot information even when `lot_id` is NULL.
- Handle empty, loading, and error states.
- Sort records by `created_at` descending by default.

Use Indonesian labels for user-facing descriptions.

Examples:

- `Kavling LOT-001 ditambahkan`
- `Harga tunai diubah dari Rp250.000.000 menjadi Rp275.000.000`
- `Luas kavling diubah dari 120 m² menjadi 130 m²`
- `Panorama 360° diperbarui`
- `Kavling LOT-001 dihapus`

Do not display raw JSON, internal database column names, or Storage object paths directly to users.

### 21.8 Audit Data Protection

Activity audit records are historical evidence and must be treated as append-only data.

Rules:

- No ordinary application workflow may edit or delete existing audit records.
- Do not expose audit mutation operations in the frontend.
- Restrict audit history access to authorized roles.
- Do not expose sensitive customer information unnecessarily in old or new JSON values.
- Review retention and backup policies before introducing any audit cleanup mechanism.

### 21.9 Development and Verification Requirements

Before completing any feature that modifies lots, verify:

1. INSERT creates exactly one creation audit entry.
2. UPDATE records only fields that actually changed.
3. UPDATE with no actual changes creates no audit entry.
4. Multiple changed fields produce the expected field-level entries.
5. DELETE preserves the complete deleted record in audit history.
6. Audit records remain available after the original lot is deleted.
7. The correct authenticated Admin is recorded.
8. Failed database operations do not create successful audit entries.
9. Transaction-related changes are not incorrectly duplicated in `Riwayat Perubahan`.
10. Panorama upload, replacement, and deletion are handled consistently.
11. Unauthorized users cannot manipulate audit records.
12. Existing lot creation, editing, deletion, transaction, and panorama workflows continue to work.

Before modifying existing implementation:

- Inspect the existing database schema, triggers, services, and page workflows.
- Preserve existing functionality and business rules.
- Avoid duplicate triggers and duplicate audit services.
- Do not assume a field or database relationship exists without checking the actual schema.
- Run production build, TypeScript validation, and `git diff --check` after implementation.

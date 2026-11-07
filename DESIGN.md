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

## 3. Visual Direction

The PoliLand visual direction is Modern-Natural, combining brand green and gold with warm neutral surfaces. Brand green is the primary operational color. Gold is an accent and may be used as a surface or icon accent. Gold used for small text must use an accessible gold text token.

The visual foundation is currently implemented in `src/theme/variables.css` and `src/styles/main.css`.

## 4. Typography

The primary typeface is Plus Jakarta Sans, loaded through Fontsource in `src/main.ts`.

Available weights:

| Weight | Token |
|---|---|
| 400 | `--font-weight-regular` |
| 500 | `--font-weight-medium` |
| 600 | `--font-weight-semibold` |
| 700 | `--font-weight-bold` |
| 800 | `--font-weight-extrabold` |

Font tokens:

- `--font-primary`
- `--font-sans` in Tailwind
- `--ion-font-family`

`--font-primary`, `--font-sans`, and `--ion-font-family` must resolve to Plus Jakarta Sans. Ionic Shadow DOM components inherit the application font through the Ionic font variable.

## 5. Brand Colors

| Token | Value | Intended usage |
|---|---|---|
| `--poliland-green` | `#355A2C` | Primary brand and action color |
| `--poliland-gold` | `#CBA044` | Brand accent and graphic accent |
| `--poliland-gold-soft` | `#F4D69A` | Soft gold surface accent |
| `--poliland-gold-text` | `#966A12` | Accessible gold text on light surfaces |
| `--poliland-gold-text-soft` | `#805708` | Accessible deeper gold text on cream surfaces |

Brand gold must not be used as text by default. Gold used as text should use a gold text token and be contrast-tested.

## 6. Semantic Colors

| Function | Token | Current value |
|---|---|---|
| Application background | `--app-background` | `#FAF9F6` |
| Primary surface | `--surface-primary` | `#FFFFFF` |
| Muted surface | `--surface-muted` | `#F5F3EE` |
| Primary text | `--text-primary` | `#252525` |
| Secondary text | `--text-secondary` | `#717178` |
| Default border | `--border-default` | `#EAE7E0` |
| Success | `--status-success` | Alias to `--poliland-green` |
| Warning | `--status-warning` | Alias to `--poliland-gold` |
| Danger | `--status-danger` | `#D94B45` |

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

| Token | Value |
|---|---|
| `--radius-control` | `12px` |
| `--radius-card` | `16px` |
| `--radius-panel` | `20px` |

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

| Prop | Type | Default |
|---|---|---|
| `variant` | `primary \| secondary \| success \| danger \| neutral` | Inferred: `primary` when no legacy `color` is provided |
| `fill` | `solid \| outline \| clear` | `solid` |
| `size` | `small \| medium \| large` | `medium` |
| `expand` | `block \| full` | None |
| `loading` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `type` | `button \| submit \| reset` | `button` |
| `color` | Ionic-compatible color | None |

The `variant` API takes priority over legacy `color`. Legacy `color` and Ionic fill values remain supported. `fill="default"` is normalized to `solid`.

#### Variants

| Variant | Solid visual direction |
|---|---|
| `primary` | PoliLand green |
| `secondary` | PoliLand gold with dark primary text |
| `success` | Semantic success green |
| `danger` | Semantic danger red |
| `neutral` | Muted surface with primary text |

Outline and clear fills preserve the same variant meaning while using transparent surfaces or borders.

#### States

- Default, hover, active, and focus-visible states use semantic tokens.
- Small, medium, and large buttons use 44px, 44px, and 48px minimum heights respectively.
- Loading and disabled states prevent interaction.
- Loading displays a spinner, retains slot text, and sets `aria-busy="true"` with a screen-reader processing label.

### AppInput

An existing shared Ionic input component is implemented for text fields and password visibility. Its current hardcoded label, control, border, focus, placeholder, icon, and password-button colors are candidates for semantic token mapping.

### AppHeader

An existing shared header supports:

- Default, marketing, and admin variants.
- Back behavior.
- Notification navigation.
- Authentication-dependent login action.

The role appearance should remain differentiated. Shared typography, surfaces, borders, and icon colors can be standardized.

### MobileTabBar

An existing shared tab bar supports public, marketing, and admin variants. Navigation structure, menu count, labels, route targets, and role access must remain distinct. Shared typography, active and inactive state, icon sizing, spacing, radius, safe area, and accessibility can be standardized.

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

Recommended semantic mapping:

| Current function | Current value examples | Recommended token |
|---|---|---|
| Label and input text | `#292a26`, `#41443e` | `--text-primary` |
| Icon and secondary text | `#898b85`, `#777b74` | `--text-secondary` |
| Control background | `#ffffff` | `--surface-primary` |
| Password button surface | `#f3f2ee` | `--surface-muted` |
| Control border | `#d5d5d0`, `#dedbd3` | `--border-default` |
| Focus border | `#c3a052` | Existing brand focus token must be selected and approved |
| Placeholder | `#999999` | `--text-secondary` |
| Error | Not currently defined in component | `--status-danger` if approved |
| Radius | `10px`, `9px` | `--radius-control` |

### AppHeader

Recommended token mapping:

| Existing style | Recommended token |
|---|---|
| Toolbar background | `--surface-muted` or existing cream background rule if role appearance requires it |
| Toolbar border | `--border-default` |
| Primary text and icons | `--text-primary` |
| Secondary label text | `--text-secondary` |
| Notification dot | `--status-danger` |
| Notification dot border | Surface and toolbar background |

### MobileTabBar

The three variants must remain separate:

| Variant | Current menu purpose |
|---|---|
| Public | Home, siteplan, progress, gallery, contact |
| Marketing | Home, kavling, potential buyers, follow-up, more |
| Admin | Home, kavling, buyers, finance, more |

Shared recommendations are semantic colors, identical icon sizing, consistent labels, 44px minimum interaction targets, visible active state, visible focus, safe-area handling, and Plus Jakarta Sans.

Role structure, route targets, labels, and menu count should not be merged.

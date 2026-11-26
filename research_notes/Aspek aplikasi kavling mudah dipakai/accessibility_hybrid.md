# Accessibility and platform feel for an Ionic Vue + Capacitor Android app (broad audience, including older users)

## Which WCAG 2.2 AA criteria most affect mobile use?

### Takeaway
The checks with the most effect on a phone app are contrast (1.4.3, 1.4.11), text resize (1.4.4), target size (2.5.8), single-pointer alternatives to dragging (2.5.7), forms and errors (3.3.x), and name/role/status exposure (4.1.2, 4.1.3). Android's own bar for target size (48 dp) is much stricter than the WCAG 2.2 AA floor (24 CSS px), so use 48 dp.

(Method note for the whole file: pages were read through a fetch tool that summarises them with a small model. Re-check any wording on the linked page before quoting it verbatim.)

### Cited Findings
Status of mobile guidance
- WCAG2Mobile is a W3C Group Draft Note dated 6 May 2025. It is work in progress, not endorsed by W3C, and excludes AAA criteria. Many mobile-specific sections (for example 1.4.3, 1.4.4, 1.4.10, 1.4.11) are placeholders that only pass through WCAG2ICT text — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)

Contrast
- [ ] 1.4.3 (AA): text and images of text have at least 4.5:1 contrast, with listed exceptions — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). "Large scale" text is at least 18 pt, or 14 pt bold — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 1.4.11 (AA): the covered non-text visuals need at least 3:1 against adjacent colours — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] Android core quality (Visual_Contrast): 4.5:1 for small text (under 18 pt, or under 14 pt bold) and 3:1 for large text and graphics — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

Target size and gestures
- [ ] 2.5.8 (AA): pointer targets at least 24x24 CSS px. Exceptions: spacing (24 px circles on undersized targets do not intersect other targets), equivalent control, inline, user-agent control, essential — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [ ] Android: every interactive element should have a touch target of at least 48x48 dp, "larger is even better" — [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps); core quality Touch_Target_Size also requires 48 dp — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- [ ] NN/g (2019): at least 1 cm x 1 cm physical, larger for primary actions, use on the move, and older adults. About 2 mm is an often-cited minimum gap, and spacing cannot rescue targets that are too small — [NN/g touch targets](https://www.nngroup.com/articles/touch-target-size/)
- [ ] 2.5.7 (AA): anything done by dragging must also work with a single pointer without dragging, unless dragging is essential — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Text resize and reflow
- [ ] 1.4.4 (AA): text resizes up to 200% without assistive technology and without loss of content or function — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). The WCAG2ICT note in WCAG2Mobile accepts either 200% enlargement or working with platform accessibility features — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)
- [ ] 1.4.10 (AA): reflow of vertically scrolling content at a width of 320 CSS px — [WCAG 2.2](https://www.w3.org/TR/WCAG22/); content needing 2-D layout (such as maps) is exempt — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)
- [ ] 1.4.12 (AA): no loss of content or function when the specified text spacing overrides are applied — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 1.3.4 orientation: lock to one orientation only when essential; supporting all orientations is best practice — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)
- See the Ionic dynamic font scaling checklist in the next section.

Focus
- [ ] 2.4.7 (AA): keyboard-operable UI has a mode where the focus indicator is visible — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 2.4.11 (AA): a focused component is not entirely hidden by author-created content — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Labels, names, status messages
- [ ] 3.3.2 (A): labels or instructions are provided where input is required — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 1.3.5 (AA): the purpose of fields collecting information about the user is programmatically determinable — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 4.1.2 (A): name and role are programmatically determinable, and changes are exposed to assistive technology — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). It matters mainly for custom components; standard platform components usually meet it when used as specified — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/)
- [ ] 4.1.3 (AA): status messages can be presented by assistive technology without receiving focus — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] Android: non-text controls need descriptions of purpose, not appearance; do not include the role word ("Submit", not "Submit button"); keep them unique (list items included); hide decorative elements. The page's examples are native Android/Compose — [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps)

Errors, redundant entry, authentication
- [ ] 3.3.1 (A): the item in error is identified and the error is described in text — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 3.3.3 (AA): give correction suggestions unless that would jeopardise security or purpose — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 3.3.4 (AA): for legal commitments or financial transactions, submissions are reversible, checked, or confirmed — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] 3.3.7 (A): information already entered in the same process is auto-populated or selectable. Exceptions: essential, security, no longer valid — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [ ] 3.3.8 (AA): no authentication step requires a cognitive function test unless there is an alternative method, a mechanism to assist, or the test is object recognition or the user's own non-text content — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [ ] 3.2.6 (A): help mechanisms that repeat across pages keep the same relative order — [What's new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Motion
- [ ] 2.3.3 Animation from Interactions: interaction-triggered motion can be disabled — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). This criterion is Level AAA, not AA (level from model knowledge; the fetched excerpt did not state it. WCAG2Mobile omits it and excludes AAA — [WCAG2Mobile](https://www.w3.org/TR/wcag2mobile-22/))
- [ ] 2.2.2 (Level A): moving content in its scope needs a way to pause, stop or hide it — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [ ] On Android 9+, Settings > Accessibility > "Remove animations" makes browsers match `prefers-reduced-motion: reduce`. MDN advises replacing large scaling, panning or zooming motion with gentler effects such as opacity — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

### Inferences
- Code checks: `<ion-input>`/`<input>` have a visible label (not placeholder only), with suitable `type`, `inputmode`, `autocomplete`; icon-only `ion-button`s have `aria-label`; decorative icons have `aria-hidden`; toasts and inline async errors use a live region or `role="status"`/`alert`; clickable `div`s are replaced by buttons.
- For login: allow paste and password-manager autofill, and add no paste blocking or puzzle CAPTCHA. These are the usual ways to satisfy the "mechanism" exception in 3.3.8.
- Swipe-only actions, drag-to-dismiss sheets, draggable maps/siteplans, panorama viewers, sliders and image croppers need tap alternatives (zoom +/- buttons, close button, directional or numeric controls). Whether an "essential" exception applies is a case-by-case judgement.
- Animations driven by JavaScript or Ionic's animation API will not obey a CSS media query, so check `window.matchMedia('(prefers-reduced-motion: reduce)')` in code. Not verified against Ionic docs. MDN's mapping is about browsers; test in the actual Android WebView.
- On Android WebView with `width=device-width`, 1 CSS px is commonly about 1 dp, so 48 dp is about `min-width/min-height: 48px`. NO PRIMARY SOURCE was fetched for this. Likewise, at the nominal 160 dp per inch, 1 cm is about 63 dp (own arithmetic, conversion basis not fetched), which is above Android's 48 dp.

### Gaps
- WCAG2Mobile's CSS-pixel-to-dp guidance was not found in the portions read (about 14k characters at the end were summarised only for 4.1.x). WCAG's own definition of the CSS pixel is a visual angle of about 0.0213 degrees ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- 1.4.13, 2.1.x, 2.4.3, 2.5.1, 2.5.2, 2.5.3 and 2.2.1 were not reviewed. They may also be relevant to touch apps.
- No primary source was found on how Ionic components behave with TalkBack.

## What do Ionic, Capacitor and Android docs say about platform behaviour?

### Takeaway
On targets of API 36 running Android 16, edge-to-edge can no longer be opted out of and `onBackPressed`/KEYCODE_BACK are no longer delivered under default predictive back, so insets and back handling must be verified on real devices. Ionic and Capacitor document back priorities, inset handling, splash control, network status and lazy routes, but say little about low-end device performance.

### Cited Findings
Hardware back button
- [ ] Ionic emits `ionBackButton`; handlers register with a priority, higher runs first, only one runs unless it calls `processNextHandler`; same priority means last registered runs first — [Ionic back button](https://ionicframework.com/docs/developing/hardware-back-button)
- [ ] Built-in priorities: overlays (action sheet, alert, loading, modal, popover, picker) 100; menu 99; router navigation 0 (propagates). Vue uses `useBackButton(priority, cb)` — [Ionic back button](https://ionicframework.com/docs/developing/hardware-back-button)
- [ ] Exit pattern: handler at priority -1, check `useIonRouter().canGoBack()`, then `App.exitApp()`. Capacitor support requires `@capacitor/app` — [Ionic back button](https://ionicframework.com/docs/developing/hardware-back-button)
- [ ] A Capacitor `App` `backButton` listener disables the default back behaviour, so the app must call `history.back()` or `exitApp()` itself. Config `disableBackButtonHandler` and `toggleBackButtonHandler()` exist since 7.1.0. The page says Ionic handles exit itself, so Ionic apps usually need not call `exitApp()` — [Capacitor App](https://capacitorjs.com/docs/apis/app). This is in some tension with the Ionic page's explicit priority -1 exit example — [Ionic back button](https://ionicframework.com/docs/developing/hardware-back-button)
- [ ] `appRestoredResult`: low-memory Android can kill the app while an external activity (such as Camera) is open; apps using such plugins should handle this event — [Capacitor App](https://capacitorjs.com/docs/apis/app)
- [ ] Android core quality: support standard back navigation and use no custom on-screen back-button prompts — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- [ ] Target API 36 on Android 16+: predictive back animations are on by default, `onBackPressed` is not called and `KEYCODE_BACK` is not dispatched. Migrate to supported back APIs, or temporarily set `android:enableOnBackInvokedCallback="false"` — [Android 16 changes](https://developer.android.com/about/versions/16/behavior-changes-16)

Edge-to-edge, safe areas, status bar
- [ ] Target API 35 on Android 15: edge-to-edge by default; status and gesture navigation bars are transparent and content draws behind them unless insets are applied; `statusBarColor`/`setStatusBarColor` have no effect; 3-button navigation gets 80% opacity by default; cutouts are treated as "always" — [Android 15 changes](https://developer.android.com/about/versions/15/behavior-changes-15). The page says to check lower-traffic screens such as sign-in, onboarding and settings — same source
- [ ] Target API 36: the `windowOptOutEdgeToEdgeEnforcement` opt-out is disabled on Android 16 devices (it still works on Android 15 devices) — [Android 16 changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- [ ] Target API 36: orientation, resizability and aspect-ratio restrictions are ignored on displays with smallest width of 600 dp or more; a temporary opt-out exists and will not apply at API 37 — [Android 16 changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- [ ] Capacitor SystemBars: on WebView below 140, CSS `env(safe-area-inset-*)` values are not correct. `insetsHandling`: `css` (current default; works like `native` and also injects `--safe-area-inset-*` variables), `native` (recommended; pads the WebView on <140 and sets env insets to 0; on 140+ follows `viewport-fit`, so use `viewport-fit=cover` to go edge-to-edge), `disable` (not recommended). Apps not disabling it should consider `EdgeToEdge.enable(this)` in `onCreate`; the page says `native` becomes default in Capacitor 9 — [Capacitor SystemBars](https://capacitorjs.com/docs/apis/system-bars)
- [ ] SystemBars style: `DARK` means light content on a dark background, `LIGHT` means dark content on a light background. The legacy StatusBar plugin's `setOverlaysWebView()` works on Android 14 or lower, or on 15 only with the edge-to-edge opt-out; SystemBars does not support overlay or background-colour setters — [Capacitor SystemBars](https://capacitorjs.com/docs/apis/system-bars)
- [ ] Ionic provides `--ion-safe-area-top/right/bottom/left` and `--ion-statusbar-padding`, applies safe-area padding automatically to some components (such as the first toolbar in a modal), and allows overrides — [Ionic advanced theming](https://ionicframework.com/docs/theming/advanced)

Keyboard
- [ ] The Keyboard plugin's `resize` option is iOS only. Android has `resizeOnFullScreen`, a workaround for the WebView not resizing in full-screen mode (for example an overlaying status bar). On Android the will-show and did-show events fire at almost the same time (same for hide); events expose `keyboardHeight` on show — [Capacitor Keyboard](https://capacitorjs.com/docs/apis/keyboard)

Splash screen
- [ ] Capacitor 4+ uses the Android 12 splash API plus `core-splashscreen` — [Capacitor SplashScreen](https://capacitorjs.com/docs/apis/splash-screen)
- [ ] `launchAutoHide` defaults to true; `launchShowDuration` defaults to 500 ms. With `launchAutoHide:false`, call `hide()` as early as possible. With the Android 12 API, several launch options (including `backgroundColor`, spinner settings, `androidScaleType`) do not work, and `hide()`'s `fadeOutDuration` is ignored (use `launchFadeOutDuration`). Android 12/12L may not show the splash image from some launch paths — [Capacitor SplashScreen](https://capacitorjs.com/docs/apis/splash-screen)
- [ ] Core quality App_Startup_Time: load quickly, or show on-screen progress feedback if loading takes over two seconds — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

Network detection
- [ ] `Network.getStatus()` and the `networkStatusChange` listener return `connected` and `connectionType` (`wifi`, `cellular`, `none`, `unknown`); listeners are removable — [Capacitor Network](https://capacitorjs.com/docs/apis/network)
- The page defines `connected` only as an active connection and says nothing about verifying internet reachability — [Capacitor Network](https://capacitorjs.com/docs/apis/network)

Font scaling in Ionic
- [ ] Dynamic font scaling needs Ionic 7.5+ and `typography.css`; it is on by default once imported. Setting `--ion-dynamic-font: initial` disables it (discouraged). With custom fonts, set `--ion-dynamic-font: var(--ion-default-dynamic-font)` and `--ion-font-family` — [Ionic dynamic font scaling](https://ionicframework.com/docs/layout/dynamic-font-scaling)
- [ ] Use `rem` (not `px`) for custom font sizes; do not set a font size on the root element; do not override Ionic component font sizes in `px`; use min-width/min-height and wrapping instead of fixed sizes and truncation — same [source](https://ionicframework.com/docs/layout/dynamic-font-scaling)
- [ ] Android WebView always scales `px` font sizes, including px limits inside `min()`/`max()`/`clamp()`, so px caps may not hold. `md` mode applies no max/min font limits. Chrome for Android ignores system font scale by default, so a browser test is not equivalent without the experimental Accessibility Page Zoom flag — [Ionic dynamic font scaling](https://ionicframework.com/docs/layout/dynamic-font-scaling)
- `@capacitor/text-zoom` offers `get()`, `getPreferred()` and `set()` (1.2 = 120%); the page has no Android-specific notes — [Capacitor TextZoom](https://capacitorjs.com/docs/apis/text-zoom)

Performance on low-end devices
- [ ] Use a stable `:key` with `v-for` over Ionic components — [Ionic Vue performance](https://ionicframework.com/docs/vue/performance)
- [ ] Lazy-load route components with `() => import(...)` so they are not in the initial chunk — [Ionic Vue navigation](https://ionicframework.com/docs/vue/navigation)
- [ ] `ion-virtual-scroll` was deprecated in v6 and removed in v7. Ionic points to `vue-virtual-scroller` (`@next` for Vue 3): `RecycleScroller`, or `DynamicScroller` for unknown heights, inside `ion-content`; add `ion-content-scroll-host` for infinite scroll, refresher, large titles and reorder — [Ionic virtual scroll](https://ionicframework.com/docs/vue/virtual-scroll)
- [ ] Always set image `width`/`height` (or CSS `aspect-ratio`) and reserve space for lazy content to avoid layout shift — [web.dev CLS](https://web.dev/articles/optimize-cls)
- [ ] Use `loading="lazy"` only for images outside the initial viewport; do not lazy-load the LCP image — [web.dev lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)
- [ ] Core quality: render frames within 16 ms (60 fps) — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality); testing covers no crashes or ANRs — same source
- [ ] Core quality also covers: preserving state after Home/relaunch and across orientation/fold changes, and requesting runtime permissions when the feature is used rather than at startup — [Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

### Inferences
- Code checks: grep for `useBackButton`, `ionBackButton` and `App.addListener('backButton'`. A raw Capacitor listener alongside Ionic's router could cause double navigation or bypass overlay priorities. Custom (non-Ionic) overlays or lightboxes need their own back handler.
- Check `targetSdkVersion`, the SystemBars config, `viewport-fit=cover`, and that fixed headers, bottom tab bars, FABs and sheets use safe-area variables. A common fallback pattern is `var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))`; this composition is my suggestion, not a quoted doc recipe. Also check how it maps onto `--ion-safe-area-*`.
- Because `connected` does not promise reachability, handle request timeouts and failures separately, with a retry control, rather than relying only on the offline banner.
- If text-zoom is used to force 100% or a low cap, it would undercut user font settings and put 1.4.4 at risk. Test at the largest Android font size and display size on a device (`adb shell settings put system font_scale 2.0` is a commonly suggested test; it came from a search summary of a third-party guide, NO PRIMARY SOURCE).
- Android's in-page "Back arrow in a toolbar" is normal navigation; the "no custom on-screen back prompts" rule should not be read as banning it (interpretation, not stated in the fetched text).

### Gaps
- Neither the Ionic back-button page nor the Capacitor App page mentions predictive back. I did not confirm from a primary source whether Ionic's `ionBackButton` works unchanged with targetSdk 36 predictive back enabled, or which Capacitor version handles it. Needs on-device testing on Android 16 and a check of Capacitor release notes/upgrade guide.
- Ionic's Vue performance page covers only `v-for` keys. No official Ionic or Capacitor guidance on low-end Android performance, image sizing or memory was found. The `vue-virtual-scroller@next` recommendation was not checked for current maintenance status.
- Minimum Capacitor version for SystemBars was not confirmed from the page.
- Core app quality was searched by keyword in the saved page, not read end to end; some long rows were not displayed.
- Whether `getPreferred()` reflects Android's font size setting, and whether WebView scales automatically on top of it (risk of double scaling), is not documented on the official page.

## What usability considerations apply to older users on phones?

### Takeaway
The main primary evidence (NN/g) points to small, faint text and small targets as the recurring phone problems, plus unclear or hard-to-see errors and unforgiving input formats. Older users are not one uniform group.

### Cited Findings
- NN/g (Kane, 8 Sep 2019) draws on research with 123 participants aged 65+ in five countries, 2001 to 2018-19, with the latest round mainly recruiting people aged 70+. Its full paid report lists 87 guidelines (not reviewed) — [NN/g older adults](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] Readability problems appeared in every study; on phones, app text was often too small and too light. Needs for larger text can start in people's 40s — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] Buttons, dropdowns and links were often too small to tap reliably — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] Older users make more errors; messages were sometimes obscure or easy to miss. "Focus on the error, explain it clearly, and make it as easy as possible to fix." — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] Accept harmless format variation (spaces, hyphens, parentheses in phone or card numbers) — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] Date and time pickers frustrated users; one participant wanted to type or speak the time — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- Digital literacy among older adults is rising; they also uninstall time-consuming apps and delete accounts that collect too much data — [NN/g](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [ ] NN/g's sizing article specifically calls for larger targets for older adults (1 cm floor, about 2 mm gap often cited) — [NN/g touch targets](https://www.nngroup.com/articles/touch-target-size/)
- A W3C task-force wiki research summary reports 10 mm minimum buttons generally (Lee & Zhai 2009) and 11.43 mm for older users (Jin et al. 2007). This was seen only in a search-result summary; the page and the original studies were not opened, and a wiki is not normative — [W3C research summary](https://www.w3.org/WAI/GL/mobile-a11y-tf/wiki/Summary_of_Research_on_Touch/Pointer_Target_Size)
- WAI states that its existing standards address most older users' needs, which overlap with disability needs (from search summary; some of these pages date from about 2008-2010) — [WAI older users](https://www.w3.org/WAI/older-users/)

### Inferences
- Code checks: body text of at least about 16 px-equivalent in `rem`; no light-grey essential text; no meaningful text below about 12-14 px; primary actions at least 48 dp tall (about 56-64 for the main call to action); visible text with icons in navigation; inline errors next to the field plus focus/scroll to the first one; phone and currency inputs that normalise formatting; a typed-entry option alongside date pickers; a visible button for every gesture; no short auto-dismiss toast as the only carrier of critical information; forms keep entered data after errors, back navigation or network loss. The specific font-size and CTA-height numbers are design heuristics with NO PRIMARY SOURCE. The labelled-icon, toast and data-retention items are also not from the fetched sources.

### Gaps
- The NN/g article does not address gestures or memory. No authoritative primary guidance on gestures for older users was confirmed. Academic results seen in search summaries were mixed and the papers were not opened.
- The NN/g evidence is from 2019 or earlier; no newer (2024-2026) NN/g study on older adults and phones was found in this limited search.
- No primary minimum body font size for older users was found.
- No research specific to Indonesian older users was searched.

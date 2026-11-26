# Mobile usability: evidence-backed aspects (Ionic Vue + Capacitor, Android primary)

Research date: 2026-11-26.

Source tags:
- No tag: the page was fetched. Fetched text passed through a summarizing tool, except the Android core quality, vitals, Android 16 and launch-time pages, which came back as page text. Re-check wording before quoting.
- **[S]**: seen only in a search-result summary. The page was not opened. Treat as weaker.
- **[NO PRIMARY]**: vendor or aggregator figure with no verified original study.

## Which usability factors have the strongest evidence for mobile apps?

### Takeaway
The firmest checkable requirements are Android's core app quality items (back, state, permissions, touch targets, contrast, startup feedback), Play's crash/ANR thresholds and WCAG 2.2. These are normative standards and platform policy, which is a different thing from experimental proof. The behavioral research located (NN/g navigation study, Baymard form testing, app-review mining) is narrower, partly old, and often about websites or e-commerce.

### Cited Findings

#### Stability and state
- Core quality: no crashes and no UI-thread blocking that causes ANRs. — [Android core app quality, Stability_ANR](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- State_Preservation: preserve state when leaving the foreground, prevent accidental data loss from back navigation and other state changes (including editable fields), and restore exact state when resumed from Recents or after lock. After a short absence, relaunch should restore as closely as possible. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- Display orientation and fold changes must not lose state, and orientations should keep functional parity. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- In a study of 6,390 low-rated reviews of 20 free **iOS** apps (2014, 12 complaint types), functional errors, feature requests and crashes were the most frequent. Privacy/ethics and hidden cost complaints hurt ratings most. 11% of reviews blamed a recent update. — [Khalid et al., IEEE Software](https://www.swag.uwaterloo.ca/www/assets/other/papers/khalid-ieeesw-2014.pdf) [S]

#### Back behavior
- Back_Button_Nav: support standard back navigation and do not use "custom, onscreen back button prompts". Back_Gesture_Nav: support gesture navigation for back and home. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- Apps targeting API 36 on Android 16+ get predictive back animations by default; `onBackPressed` is not called and `KEYCODE_BACK` is not dispatched. Apps still intercepting back this way must migrate or temporarily set `android:enableOnBackInvokedCallback="false"`. — [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- Ionic in Capacitor supports hardware back only with `@capacitor/app` installed. `ionBackButton` handlers run by priority (one per press unless `processNextHandler` is called; ties go to the most recently registered). Overlays are 100, menu 99, navigation 0. The documented exit pattern is a priority -1 handler calling `App.exitApp()` when the router cannot go back. The page says nothing about predictive back. — [Ionic hardware back button](https://ionicframework.com/docs/developing/hardware-back-button)
- A `backButton` listener in `@capacitor/app` disables default back behavior. A `disableBackButtonHandler` option exists since 7.1.0. — [Capacitor App API](https://capacitorjs.com/docs/next/apis/app) [S]
- Capacitor Android 8.x targets SDK 36. — [Capacitor target SDK](https://capacitorjs.com/docs/android/setting-target-sdk) [S]

#### Navigation visibility
- NN/g study (2016, 179 participants, 6 **websites**): on mobile, hidden navigation was used in 57% of cases vs 86% for combo (some visible plus hidden), and tasks took about 15% longer. Time to first navigation use (about 26 s vs 24 s) was not significantly different. Across desktop and mobile combined, discoverability fell by more than 20% and difficulty was 2.6 hidden, 2.3 combo, 2.1 visible (lower is easier). — [NN/g hamburger menus](https://www.nngroup.com/articles/hamburger-menus/)
- NN/g advises showing links visibly when there are 4 or fewer; beyond that, hide some and support the menu with in-page links. Visible-only navigation was not tested on phones. — [NN/g hamburger menus](https://www.nngroup.com/articles/hamburger-menus/)
- A 2025 follow-up reports the hamburger icon is now widely recognized, while hidden-navigation best practices still apply. — [NN/g icon recognizability](https://www.nngroup.com/articles/hamburger-menu-icon-recognizability/) [S]
- Material 3 navigation bar: 3 to 5 destinations; use tabs for fewer than 3; do not use the bar for more than 5. — [M3 navigation bar](https://m3.material.io/components/navigation-bar/guidelines) [S]

#### Loading feedback and perceived speed
- Response limits: 0.1 s feels instantaneous; 1 s keeps flow of thought; 10 s is the attention limit. Above 1 s show that the system is working. Above 10 s show percent-done progress and a clear way to interrupt. For unknown amounts of work show running progress, with a spinner as last resort. — [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/)
- Under 1 s: no loading indicator. About 2 to 10 s: spinner for a single module, skeleton for a full page. Over 10 s: progress bar with duration estimate. Uploads, downloads and conversions: progress bar, not skeleton. Avoid frame-only skeletons (header/footer only). — [NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)
- App_Startup_Time: load quickly, or show progress feedback if loading exceeds 2 s. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- Slow starts can lead to poor ratings or abandonment. TTID (first frame) and TTFD (usable) are distinct; TTFD requires calling `reportFullyDrawn`. Guidance: lazy initialization, no draw-blocking disk/network I/O. — [Android launch time](https://developer.android.com/topic/performance/vitals/launch-time)
- Rendering_Performance: a frame every 16 ms or less (60 fps). — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

#### Forms, input and error recovery
- Baymard (e-commerce testing; article dated Jan 2024 per search): validate on blur, or at expected length for fixed-length fields; never flag untouched or half-typed fields; clear the error on keystroke once valid; re-validate dependent fields; keep submit-time errors as fallback and preserve entries. It also recommends positive validation on every field. 31% of benchmarked sites lacked inline validation (the page's summary says 32%; internal inconsistency). — [Baymard inline validation](https://baymard.com/research-articles/inline-form-validation)
- NN/g: validate after the field is complete; put messages beside the field; pair color with icons; do not rely on a summary alone; avoid tooltips for errors; use modals sparingly; investigate when the same error occurs 3 or more times. NN/g recommends success marks only for complex fields. — [NN/g form errors](https://www.nngroup.com/articles/errors-forms-design-guidelines/). This conflicts with Baymard's "every field" positive validation.
- Baymard recommends field-appropriate keyboards (email, phone, numeric); its benchmark finding that 60% of sites got keyboard basics wrong dates to 2015. — [Baymard touch keyboards](https://baymard.com/blog/mobile-touch-keyboards) [S]
- Baymard argues against inline (placeholder-style) labels because they vanish on typing (2013 article). — [Baymard mobile checkout forms](https://baymard.com/blog/mobile-ecommerce-checkout-forms) [S]
- WCAG 2.2: 1.3.5 (AA) requires input purpose to be programmatically determinable for listed purposes; 3.3.7 Redundant Entry is Level A; 3.3.8 Accessible Authentication (Minimum) is AA (only titles and levels were retrieved for the last two). — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Core quality: autofill hints for credentials, address, phone, card data (Autofill_Hints); Credential Manager integration; biometric support to protect financial transactions or sensitive information such as important documents. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

#### Touch targets and readability
- Android: touch targets at least 48 dp. Contrast 4.5:1 for small text (under 18 pt, or under 14 pt bold), 3:1 for large text and graphics. Line length 45 to 75 characters. Light and dark theme support, including web content the app accesses. Describe UI elements for screen readers. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- WCAG 2.5.8 (AA): pointer targets at least 24x24 CSS px; exceptions are spacing (24 px circles do not overlap), equivalent control, inline, user-agent default, essential. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- WCAG: 1.4.3 text 4.5:1, large 3:1; 1.4.4 resize to 200% without loss; 1.4.10 reflow at 320 CSS px width without two-dimensional scrolling (maps and other 2D content excepted); 1.4.11 UI components and graphics 3:1; 2.5.7 Dragging Movements is AA (level only retrieved). — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Targeting API 36 on Android 16: edge-to-edge opt-out is disabled. On displays with smallest width 600dp or more, orientation, resizability and aspect-ratio locks are ignored (temporary opt-out, gone at API 37; games and some other cases exempt). — [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)

#### Onboarding
- NN/g: tutorials did not make users faster or more successful and made tasks seem harder; most apps do not need instructional onboarding. — [NN/g onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/) [S] (the tutorial study itself, about 2020, was not opened and its exact URL was not captured)

#### Permissions and notifications
- Request only minimum permissions (coarse over fine location where possible); request at time of use, not at startup; explain why; degrade gracefully on denial or revocation without blocking the whole app. — [Android core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)
- NN/g: tie requests to a user action, avoid stacked system prompts, watch content and timing, avoid dark patterns, allow reversing the decision (article about 2019). — [NN/g permission requests](https://www.nngroup.com/articles/permission-requests/) [S]
- Notifications must be relevant; no cross-promotion; use proper channels and priority; group multiples; set timeouts where apt. — [Android core app quality, Notification_Quality](https://developer.android.com/docs/quality-guidelines/core-app-quality)

#### Offline and poor network
- Android offline-first guidance: network-backed repositories have local and network data sources, the local one being the source of truth; queued writes drain with exponential backoff on reconnect (often via WorkManager); critical data should be saved locally first. — [Android offline-first](https://developer.android.com/topic/architecture/data-layer/offline-first) [S]
- Android "Build for Billions": keep the app usable offline through caching and queued requests; where possible, do not notify users of lost connectivity. — [Android connectivity](https://developer.android.com/docs/quality-guidelines/build-for-billions/connectivity) [S]

### Inferences
**Priority order and codebase checks.** The ranking is researcher judgment (severity, strength of source, relevance to this stack). No source ranks these factors against each other.

P0, breaks the task or affects store standing
1. **Crashes and errors.** Check: global Vue error handler and unhandled-rejection handling; native crash reporting; every async call has a failure path with a visible message and retry; no blank screen after a failed lazy route load; production build has no debug libraries (Production_Build_Quality).
2. **Back.** Check: `@capacitor/app` is installed; hardware and gesture back closes the top overlay first (including custom, non-Ionic modals, sheets and viewers, which would need their own handler or history entry), then navigates, then exits at root; no loops back into login or splash; custom `ionBackButton`/`backButton` listeners do not swallow default behavior; `targetSdk` and `enableOnBackInvokedCallback` are consistent; test the gesture on a real Android 16 device. Ionic/Capacitor predictive-back behavior is unverified.
3. **No lost input.** Check: leaving a dirty form via back, tab switch or modal dismiss either confirms or keeps a draft; failed submits keep values; long forms and uploads survive backgrounding (a camera or file picker round trip, or process death, may reload the WebView, so persist drafts).

P1, hits nearly every session
4. **Loading feedback.** Check: pressed state within 100 ms; nothing flashes for loads under 1 s (e.g. delayed skeleton); every request over 1 s shows a state; skeletons mirror the page layout; uploads show percentage; waits over 10 s can be cancelled; requests have timeouts that lead to an error state with retry; submit buttons disable while pending; splash or progress covers startup over 2 s.
5. **Poor network.** Check: distinct loading, empty, error and offline states (a failed fetch must not render as "no data"); cached last data shown; reconnect refetches; retried writes cannot duplicate records. For transactional actions, state clearly that something has not been sent. This departs from the "do not notify" advice, which suits content that can be queued silently. WorkManager is native; a Capacitor app would need a web or plugin equivalent.
6. **Forms.** Check: correct `type`, `inputmode`, `autocomplete`, `enterkeyhint`; persistent visible labels; blur validation and clear-on-fix; message beside the field and focus/scroll to the first error; messages say how to fix; keyboard does not cover the focused field or submit button; already-known data is prefilled; password managers and paste work on login.
7. **Touch and readability.** Check: hit area at least 48x48 CSS px (assumes 1 CSS px is about 1 dp with a `width=device-width` viewport; icon buttons, close buttons, chips and map pins are likely risks); text 4.5:1 and component/graphic 3:1; layout works at 320 px wide and with enlarged font (200% test); viewport does not block zoom without reason; any drag-only action has a tap alternative (map pan/zoom should offer zoom buttons); safe-area insets applied under edge-to-edge; icon-only buttons have accessible names.

P2, adoption, trust and retention
8. **Navigation.** Check: 3 to 5 bottom destinations with text labels (labels are researcher advice; no label source was retrieved); primary tasks are not only behind a menu; active tab is indicated; each tab keeps a sensible stack. The Android "no on-screen back" wording appears to target custom prompts; platform-standard app-bar back arrows are common, so do not remove Ionic back buttons on this line alone (interpretation, not verified).
9. **Permissions and notifications.** Check: no permission call in startup code (`main.ts`, root component mount); each request follows a user action; denial path works and offers a route to settings; notification channels are separated by type.
10. **Onboarding and sign-in.** Check: no forced multi-slide tutorial; any intro is skippable and shown once; users can see value before sign-up where the business permits; session persists across restarts.

Web Vitals in a hybrid app: LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1 at the 75th percentile are web "good" targets ([web.dev](https://web.dev/articles/vitals), page updated 2024-10-31). Using them for a bundled WebView app is a proxy, not a Play requirement, and field collection may behave differently in single-page apps.

### Gaps
- No controlled study was found that ranks these factors by effect on mobile usability or retention.
- No mobile-specific bottom-tab-bar study was retrieved.
- NN/g onboarding and permission pages, Android offline pages and M3 pages were not opened.
- No quantitative evidence on offline UX effects was found.
- Whether current Ionic and Capacitor versions render predictive back animations correctly was not established. Installed versions were not checked (no code reading in scope).
- WCAG normative text for 3.3.1, 3.3.3, 2.5.5, 3.2.6, 3.3.7, 3.3.8 and 2.5.7 was not retrieved (page truncated).

## What concrete thresholds exist?

### Takeaway
For Android, use 48 dp targets, 4.5:1 and 3:1 contrast, feedback past 2 s at startup (1 s per NN/g for interactions), and keep Play crash and ANR rates under 1.09% and 0.47%.

### Cited Findings

| Area | Threshold | Source |
|---|---|---|
| Instant / flow / attention | 0.1 s / 1 s / 10 s | [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/) |
| Loading indicator | none under 1 s; spinner or skeleton about 2-10 s; progress bar over 10 s | [NN/g](https://www.nngroup.com/articles/skeleton-screens/) |
| Startup feedback | required if load exceeds 2 s | [Android](https://developer.android.com/docs/quality-guidelines/core-app-quality) |
| Frame time | 16 ms or less | [Android](https://developer.android.com/docs/quality-guidelines/core-app-quality) |
| Touch target (Android) | at least 48 dp | [Android](https://developer.android.com/docs/quality-guidelines/core-app-quality) |
| Touch target (WCAG AA floor) | 24x24 CSS px with exceptions | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |
| Contrast | 4.5:1 text; 3:1 large text and UI/graphics | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| Text resize / reflow | 200% / 320 CSS px width | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| Line length | 45-75 characters | [Android](https://developer.android.com/docs/quality-guidelines/core-app-quality) |
| Bottom nav destinations | 3-5 | [M3](https://m3.material.io/components/navigation-bar/guidelines) [S] |
| Web Vitals (p75, web) | LCP 2.5 s; INP 200 ms; CLS 0.1 | [web.dev](https://web.dev/articles/vitals) |
| User-perceived crash rate | 1.09% overall; 8% per phone model | [Android vitals](https://developer.android.com/topic/performance/vitals) |
| User-perceived ANR rate | 0.47% overall; 8% per phone model | [Android vitals](https://developer.android.com/topic/performance/vitals) |

- Exceeding Play bad-behavior thresholds may reduce store visibility and may show a listing warning; Play assesses the last 28 days. — [Android vitals](https://developer.android.com/topic/performance/vitals)
- Excessive partial wake locks threshold is 5% overall. Memory, bitmap memory and code-optimization metrics may affect visibility from February 2027 (apps with more than 10 MB DEX code need at least 25% optimization, obfuscation and shrinking). — [Android vitals](https://developer.android.com/topic/performance/vitals)

### Inferences
- Design to 48 CSS px and treat WCAG's 24 px as an absolute floor.
- Android states large-text cutoffs in points in a way that differs in presentation from web units; for WebView CSS, apply the WCAG definition.
- The vitals thresholds are measured in Play Console, so they cannot be verified from code alone. Store reporting also covers only apps installed from Google Play with consenting users ([Android vitals](https://developer.android.com/topic/performance/vitals)).

### Gaps
- No minimum body text size was sourced (Material type scale and Android `sp` guidance not retrieved). WCAG's retrieved criteria address resizing and contrast, and no minimum size was seen.
- Apple HIG was not retrieved, so no Apple target-size figure is reported.
- Numeric Play "excessive startup time" thresholds were not retrieved (the fetched launch-time page did not contain them).
- NN/g's skeleton guidance as retrieved does not clearly cover the 1-2 s band.

## What are the most common reasons users abandon or uninstall apps?

### Takeaway
Survey figures point to non-use, storage, ads, notifications and performance or crashes, but the numbers are weak: mostly vendor or secondary, often old, with differing methods. The better-documented review study shows what users complain about, which is not a measure of uninstalls.

### Cited Findings
All items here come from search summaries only. The summary blended several result pages, so the per-figure link could not be verified; the links below are candidate pages from that result set.
- In a survey of over 2,000 users: no longer using the app 39.9%, limited storage 18.7%, too much advertising 16.2%, excessive notifications 12.6%. Original study and page not pinned down. — [MarketingProfs, candidate](https://www.marketingprofs.com/charts/2023/49361/why-people-delete-apps-from-their-phones) [S] [NO PRIMARY]
- 26% delete apps because they never used them (attributed to Airship). — [Business of Apps](https://www.businessofapps.com/news/quarter-of-app-users-delete-apps-because-they-never-use-them/) [S] [NO PRIMARY]
- Other figures in the same result set: free up storage 32% and too many ads 30%; 48% uninstalled a slow app (attributed to Dimensional Research); 86% would uninstall over a crash or outage (attributed to AppDynamics, stated intent); 68% cite long registration (about 2015); 43% cite excessive permissions. Exact source pages are unverified. — [CleverTap, candidate](https://clevertap.com/blog/uninstall-apps/), [LinkedIn, candidate](https://www.linkedin.com/pulse/top-12-reasons-why-users-frequently-uninstall-mobile-apps-fakhruddin), [infographic, candidate](https://www.dotcominfoway.com/blog/infographic-why-users-uninstall-your-app/) [S] [NO PRIMARY]
- An academic survey exists (121 respondents, 26 countries by the search summary); its breakdown was not retrieved. — [ResearchGate](https://www.researchgate.net/publication/320525292_Why_Do_Users_Install_and_Delete_Apps_A_Survey_Study) [S]
- Review mining (iOS, 2014): functional errors, feature requests and crashes most frequent; privacy/ethics and hidden cost most damaging to ratings. — [Khalid et al.](https://www.swag.uwaterloo.ca/www/assets/other/papers/khalid-ieeesw-2014.pdf) [S]

### Inferences
- Do not quote any uninstall percentage in a final report as established fact.
- Across these weak sources and the platform guidance, the actionable themes are reliability, speed, notification restraint, permission restraint, short sign-up and app size. Code checks: APK/AAB and bundled asset size (large images and media), lazy-loaded routes, notification frequency and opt-out controls.
- For an app that users may open only occasionally, "no longer used" may reflect the usage cycle as much as usability (speculation).

### Gaps
- No current (2025-2026) primary study with transparent methodology on uninstall reasons was found in one extended and one standard search.
- No Android-specific or real-estate-specific abandonment data was found or searched in depth.

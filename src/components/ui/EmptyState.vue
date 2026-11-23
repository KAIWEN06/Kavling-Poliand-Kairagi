<template>
  <section class="ui-empty" :class="{ 'ui-empty--compact': compact }" role="status">
    <svg class="ui-empty__art" viewBox="0 0 200 140" fill="none" aria-hidden="true">
      <!-- Latar: petak kavling -->
      <g class="plan">
        <path d="M14 112 L52 36 L110 28 L118 104 Z" />
        <path d="M118 104 L110 28 L168 40 L186 108 Z" />
        <path d="M52 36 L40 14 L96 8 L110 28" />
      </g>

      <!-- Glyph per fitur -->
      <g v-if="kind === 'clients'" class="glyph">
        <circle cx="100" cy="58" r="15" class="fill" />
        <path d="M70 108 C70 88 84 78 100 78 C116 78 130 88 130 108" />
        <circle cx="142" cy="44" r="7" class="gold" />
        <path d="M142 41 V47 M139 44 H145" class="gold-line" />
      </g>

      <g v-else-if="kind === 'transactions'" class="glyph">
        <rect x="64" y="34" width="72" height="76" rx="6" class="fill" />
        <path d="M76 56 H124 M76 72 H124 M76 88 H104" />
        <path d="M122 100 l6 6 l12 -14" class="gold-line" />
      </g>

      <g v-else-if="kind === 'payments'" class="glyph">
        <rect x="58" y="44" width="84" height="54" rx="7" class="fill" />
        <path d="M58 62 H142" />
        <path d="M70 84 H92" />
        <circle cx="132" cy="38" r="12" class="gold" />
        <path d="M132 33 V43 M128 36 H134 a2.5 2.5 0 0 1 0 5 H128" class="gold-line" />
      </g>

      <g v-else-if="kind === 'spk'" class="glyph">
        <path d="M70 26 H114 L134 46 V112 H70 Z" class="fill" />
        <path d="M114 26 V46 H134" />
        <path d="M80 62 H122 M80 76 H122" />
        <path d="M80 98 q6 -10 12 0 t12 0" class="gold-line" />
      </g>

      <g v-else-if="kind === 'lots'" class="glyph">
        <path d="M62 100 L82 52 L124 46 L138 96 Z" class="fill" />
        <path d="M100 30 V70" />
        <path d="M100 30 L120 38 L100 46" class="gold" />
      </g>

      <g v-else-if="kind === 'documents'" class="glyph">
        <rect x="62" y="40" width="76" height="58" rx="6" class="fill" />
        <path d="M62 54 H92 L98 46 H138" />
        <path d="M76 74 H124 M76 86 H108" />
      </g>

      <g v-else-if="kind === 'notifications'" class="glyph">
        <path d="M100 32 C82 32 74 46 74 62 V78 L66 90 H134 L126 78 V62 C126 46 118 32 100 32 Z" class="fill" />
        <path d="M92 98 a8 8 0 0 0 16 0" />
        <circle cx="122" cy="40" r="6" class="gold" />
      </g>

      <g v-else class="glyph">
        <circle cx="94" cy="66" r="24" class="fill" />
        <path d="M112 84 L132 104" />
        <circle cx="134" cy="40" r="6" class="gold" />
      </g>
    </svg>

    <h3 class="ui-empty__title">{{ title }}</h3>
    <p v-if="description" class="ui-empty__text">{{ description }}</p>
    <div v-if="$slots.default" class="ui-empty__action">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
export type EmptyKind =
  | 'clients'
  | 'transactions'
  | 'payments'
  | 'spk'
  | 'lots'
  | 'documents'
  | 'notifications'
  | 'generic'

withDefaults(
  defineProps<{
    kind?: EmptyKind
    title: string
    description?: string
    compact?: boolean
  }>(),
  { kind: 'generic', description: '', compact: false },
)
</script>

<style scoped>
.ui-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}
.ui-empty--compact { padding: var(--space-6) var(--space-4); }

.ui-empty__art {
  width: min(220px, 60vw);
  height: auto;
  margin-bottom: var(--space-2);
}
.ui-empty--compact .ui-empty__art { width: 140px; }

.plan path {
  stroke: var(--border-strong);
  stroke-width: 1.25;
  stroke-dasharray: 3 4;
  stroke-linejoin: round;
}
.glyph {
  stroke: var(--green-700);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.glyph .fill { fill: var(--surface-primary); }
.glyph .gold { fill: var(--gold-100); stroke: var(--gold-700); }
.glyph .gold-line { stroke: var(--gold-700); }

.ui-empty__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  text-wrap: balance;
}
.ui-empty__text {
  margin: 0;
  max-width: 44ch;
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: var(--leading-body);
  text-wrap: pretty;
}
.ui-empty__action {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>

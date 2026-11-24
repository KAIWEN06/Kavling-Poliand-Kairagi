// UserPromptSubmit hook: injects a skill reminder when the prompt looks UI-related.
// Reads the hook payload from stdin, prints JSON with additionalContext on stdout.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let prompt = "";
  try {
    prompt = String(JSON.parse(raw).prompt || "");
  } catch {
    return;
  }
  const p = prompt.toLowerCase();
  const has = (re) => re.test(p);

  const skills = new Set();

  const ui =
    /\b(ui|ux|tampilan|desain|design|halaman|page|layout|komponen|component|styling|style|css|tailwind|warna|tema|theme|modal|button|tombol|card|form|navbar|sidebar|header|footer|responsif|responsive|mobile|\.vue)\b/;
  if (has(ui) || /src[\\/](views|components)/.test(p)) {
    skills.add("ui-ux-pro-max");
    skills.add("mobile-native");
  }
  if (has(/\b(responsif|responsive|layout|grid|tap|sentuh|touch|overflow|breakpoint)\b/))
    skills.add("antislop-layoutmobile");
  if (has(/\b(warna|color|kontras|contrast|fokus|focus|aksesibilitas|accessibility|a11y|aria)\b/))
    skills.add("antislop-human");
  if (has(/\b(animasi|animation|animate|transisi|transition|motion|gerak)\b/)) {
    skills.add("find-animation-opportunities");
    skills.add("improve-animations");
  }
  if (has(/\b(design token|token|design system|design-system)\b/)) skills.add("design-system");

  if (skills.size === 0) return;

  const list = [...skills].join(", ");
  const msg =
    `Pengingat proyek (CLAUDE.md > Skills): tugas ini terdeteksi terkait UI. ` +
    `Sebelum mengerjakan, panggil lewat tool Skill: ${list}. ` +
    `Proyek ini Vue 3, bukan React; jangan salin kode React. ` +
    `Sebutkan skill yang dipakai di awal jawaban. Abaikan jika ternyata tugasnya non-visual.`;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: msg },
    }),
  );
});

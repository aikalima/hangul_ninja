import type { MasterPersona } from '@/lib/master-persona';

// Match the cel-shaded mascot in celebration.ts: silver hair, navy robes,
// coral scarf, gold trim and a turquoise diamond headband.
export function MasterPortrait({ persona }: { persona: MasterPersona }) {
  const yuna = persona === 'yuna';
  return (
    <svg className="master-portrait" viewBox="0 0 160 180" fill="none" aria-hidden="true">
      <g stroke="#182339" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {yuna && <path d="M111 42Q150 27 144 71L151 126 124 113 116 66Z" fill="#d8ecf4" />}
        <path d="m89 116 32 4 24-12-13 27-39-4" fill="#f16b69" />
        <path d="m48 119 29-13 31 13 23 35-5 22H32l-4-22Z" fill="#354766" />
        <path d="m79 116 29 3 23 35-5 22H88Z" fill="#23304b" />
        <path d="m54 120 31 40 5 16M35 164h89" stroke="#d7b578" strokeWidth="6" />
        <path d="m103 120-27 34" stroke="#f0dec0" strokeWidth="4" />
        <path d={yuna
          ? 'M38 77 27 48 40 32 60 20 91 18 115 32 127 52 120 83 105 99H44Z'
          : 'M37 73 23 43 41 47 37 22 57 32 72 10 82 29 105 13 106 34 128 28 120 51 135 61 117 82Z'} fill="#d8ecf4" />
        <path d="M42 52h75l1 37-15 24-24 13-24-14-17-24Z" fill="#ffd2b1" />
        <path d="m104 55 13-3 1 37-15 24-24 13 16-22Z" fill="#eaa084" stroke="none" />
        <path d="m36 48 85 1 2 19-84 1Z" fill="#182b47" />
        <path d="M65 49h29v19H65Z" fill="#b7d7e1" />
        <path d="m79 52 9 7-9 7-8-7Z" fill="#48d7d1" strokeWidth="2" />
        <path d="m40 37 25-9-13 29M96 28l25 13-12 17" fill="#f1f9ff" />
        <path d="M48 83q11-9 22 0" strokeWidth="4" />
        <ellipse cx="60" cy="86" rx="5" ry="7" fill="#48d7d1" strokeWidth="2" />
        <circle cx="62" cy="83" r="2" fill="#fff" stroke="none" />
        <path d="m92 86 9-5 9 5" strokeWidth="4" />
        {yuna && <path d="m48 82-4-4m66 7 4-4" strokeWidth="2" />}
        <path d="M70 106q10 7 20-1" strokeWidth="3" />
        <path d="M48 99h9m45 0h8" stroke="#eaa084" strokeWidth="4" />
      </g>
    </svg>
  );
}

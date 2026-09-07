export type MasterPersona = 'yuna' | 'minho';
export const MASTER_PERSONA_KEY = 'hangul-ninja-master-persona';
export function masterAudioPath(file: string, persona: MasterPersona) {
  return `/audio/${persona === 'minho' ? 'minho/' : ''}${file}.wav`;
}

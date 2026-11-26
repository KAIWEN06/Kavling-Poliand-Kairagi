export const mascotAnimations = {
  passwordCover: 'mascot_01_password_cover',
  coverEnter: 'mascot_02_password_enter',
  coverExit: 'mascot_03_cover_exit',
  passwordPeek: 'mascot_04_password_peek',
  peekEnter: 'mascot_05_peek_enter',
  peekExit: 'mascot_06_peek_exit',
  pointDown: 'mascot_07_point_down',
  wave: 'mascot_08_wave',
  peekToCover: 'mascot_09_peek_to_cover',
  passwordError: 'mascot_10_password_error',
  idle: 'mascot_11_idle',
  lookDown: 'mascot_12_look_down',
  lookDownEnter: 'mascot_13_look_down_enter',
  lookDownExit: 'mascot_14_look_down_exit',
} as const

export type MascotClip = keyof typeof mascotAnimations
export type MascotPose = 'idle' | 'lookDown' | 'cover' | 'peek'
export type MascotInputState = 'idle' | 'email' | 'passwordCover' | 'passwordPeek'

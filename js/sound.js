/* The app's two sounds, made in the page instead of loaded.
 *
 * This app used to play nothing at all, on purpose. It plays two things now, and
 * both of them are oscillators made here: no audio file, no fetch, nothing that
 * needs a network — the same rule the rest of the app keeps, and the reason it
 * still works from a home screen with no signal.
 *
 *   a clack   a piece lands on the board: the learner's move and Pip's
 *   a chime   a star — a puzzle solved on the first try, and nothing else
 *
 * There is deliberately no third sound. A wrong answer gets words in the sheet,
 * not a buzzer: a noise for failing teaches a child to stop trying.
 *
 * The two rules this file keeps:
 *
 *   - Off until the child turns it on, in the level sheet. That click is also the
 *     gesture a browser's autoplay policy asks for, so the AudioContext is born
 *     behind it and never at load — `restore` puts the stored choice back without
 *     touching audio at all, which is the difference between remembering a
 *     setting and making a noise.
 *   - A reader whose device asks for less motion is not given sound by default
 *     either: the toggle starts off for everyone, so the only way anyone hears
 *     any of this is by asking for it themselves.
 */

const GAP = 0.0001;   // a gain ramp cannot reach zero, only near it
let ctx = null;
let on = false;

/* Made on the first sound the child asked for, never at load. A context handed
   back suspended (which a browser is entitled to do when the gesture is not
   obvious) is asked to resume here, on every sound, because it costs nothing. */
function context() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* One oscillator with one envelope. The gain is ramped up and back down rather
   than switched on and off: a waveform cut mid-cycle is a click, and a click is
   not the sound either of these is meant to be. */
function note({ freq, at = 0, length = 0.1, type = 'triangle', gain = 0.06, to = null }) {
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
  amp.gain.setValueAtTime(GAP, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  amp.gain.exponentialRampToValueAtTime(GAP, t0 + length);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.02);
}

/* A piece lands: a short wooden knock, two tones falling together. */
function move() {
  if (!on) return;
  note({ freq: 210, to: 120, length: 0.07, gain: 0.07 });
  note({ freq: 88, to: 66, length: 0.05, gain: 0.05, at: 0.004, type: 'sine' });
}

/* A star: three notes up, close enough together to be a chime, not a tune. */
function star() {
  if (!on) return;
  [784, 988, 1319].forEach((freq, i) => note({ freq, at: i * 0.085, length: 0.16, type: 'sine', gain: 0.055 }));
}

export const sound = {
  /* Whether the child is hearing the app. The one switch, and it is theirs. */
  enabled: () => on,

  /* The stored choice, put back at the start of a session. It deliberately does
     not touch audio: an AudioContext may only be created behind a gesture. */
  restore(value) {
    on = !!value;
  },

  /* The toggle in the level sheet. Its click is the gesture, so this is where the
     context is born — and the clack is the answer to "did that work?". */
  setEnabled(value) {
    on = !!value;
    if (on) { context(); move(); }
  },

  move,
  star,
};

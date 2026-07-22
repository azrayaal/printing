/**
 * Panggilan suara antrian | memakai Web Speech API bawaan browser,
 * jadi tetap berjalan offline tanpa layanan eksternal.
 *
 * Contoh keluaran untuk nomor "B-020" di Loket 2:
 *   "Nomor antrian B 20, silakan menuju Loket 2"
 */

const HURUF = {
  A: 'A',
  B: 'Be',
  C: 'Ce',
  D: 'De',
}

/** "B-020" → "B 20" ; "020" → "20" (nol di depan tidak ikut dibaca) */
export function ejaNomor(queueNumber) {
  const [prefix, digits] = String(queueNumber).split('-')
  if (!digits) return String(queueNumber)
  const angka = String(Number(digits))
  return `${HURUF[prefix] || prefix} ${angka}`
}

export function suaraTersedia() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Bunyi bel dua nada sebelum pengumuman (WebAudio, tanpa file aset). */
function bunyiBel() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return 0
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)

    ;[
      [880, 0],
      [660, 0.28],
    ].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      const t = ctx.currentTime + delay
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
      osc.start(t)
      osc.stop(t + 0.3)
    })
    setTimeout(() => ctx.close(), 1200)
    return 700 // jeda sebelum suara mulai (ms)
  } catch {
    return 0
  }
}

/**
 * Umumkan satu nomor antrian.
 * @param {string} queueNumber contoh "B-020"
 * @param {string} counter     contoh "Loket 2"
 * @param {{ chime?: boolean, repeat?: number }} opts
 */
export function panggilAntrian(queueNumber, counter, { chime = true, repeat = 2 } = {}) {
  if (!suaraTersedia()) return

  const teks = counter
    ? `Nomor antrian, ${ejaNomor(queueNumber)}, silakan menuju ${counter}`
    : `Nomor antrian, ${ejaNomor(queueNumber)}`

  const jeda = chime ? bunyiBel() : 0

  setTimeout(() => {
    window.speechSynthesis.cancel()
    for (let i = 0; i < Math.max(1, repeat); i++) {
      const u = new SpeechSynthesisUtterance(teks)
      u.lang = 'id-ID'
      u.rate = 0.88
      u.pitch = 1
      const id = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith('id'))
      if (id) u.voice = id
      window.speechSynthesis.speak(u)
    }
  }, jeda)
}

/** Hentikan pengumuman yang sedang berjalan. */
export function hentikanSuara() {
  if (suaraTersedia()) window.speechSynthesis.cancel()
}

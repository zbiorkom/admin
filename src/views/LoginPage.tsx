import { useRef, useState } from "react";
import { login, isWebAuthnSupported, isUserCancellation } from "../api/auth";
import { register } from "../api/register";
import { useAuth } from "../auth/AuthContext";
import { describeError } from "../api/client";
import "./LoginPage.less";

const MARQUEE_TOP =
  "★彡 WITAJ NA MOJEJ STRONCE 彡★ ♫ WŁĄCZ GŁOŚNIKI ♫ ► najlepiej ogladac w 800x600 ◄ 💾 dodaj do ULUBIONYCH 💾 ✿ pozdro dla mamy ✿ 🐹 HAMPTER DANCE 🐹 ⭐ 4 077 dni online ⭐ ";
const MARQUEE_BOT =
  "🖥️ zoptymalizowane pod Internet Explorer 5.0 🖥️ ••• nie kradnij mojego kodu źródłowego ••• 📟 zadzwoń: 0-700-ADMIN 📟 ••• ta strona nic nie sprzedaje ••• 🌈 www.zbiorkom.geocities.com 🌈 ";

export function LoginPage() {
  const { onAuthenticated } = useAuth();
  const supported = isWebAuthnSupported();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regOpen, setRegOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const enrollRef = useRef<HTMLTextAreaElement>(null);

  async function handleLogin() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const name = await login();
      onAuthenticated(name);
    } catch (e) {
      if (isUserCancellation(e)) setError("Anulowano.");
      else setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    if (regBusy) return;
    const name = username.trim();
    if (!name) {
      setRegError("Wpisz nazwę.");
      return;
    }
    setRegBusy(true);
    setRegError(null);
    setEnrollment(null);
    setCopied(false);
    try {
      setEnrollment(await register(name));
    } catch (e) {
      if (isUserCancellation(e)) setRegError("Anulowano.");
      else if (e instanceof Error && e.name === "InvalidStateError")
        setRegError("Klucz już zarejestrowany.");
      else setRegError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegBusy(false);
    }
  }

  async function handleCopy() {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      enrollRef.current?.select();
    }
  }

  return (
    <div className="y2k">
      <div className="y2k__marquee">
        <div className="y2k__marquee-track">
          {MARQUEE_TOP}
          {MARQUEE_TOP}
        </div>
      </div>

      {/* Unrelated banner ad */}
      <div className="y2k__banner" role="presentation">
        🎰🎰 GRATULACJE! Jesteś ODWIEDZAJĄCYM NR 1&nbsp;000&nbsp;000!!! KLIKNIJ,
        ABY ODEBRAĆ NAGRODĘ 🎁🎰🎰
      </div>

      <div className="y2k__card">
        <h1 className="y2k__wordart">★ ZBIORKOM.LIVE ★</h1>
        <p className="y2k__blink">🔥 ADMIN 🔥</p>

        <div className="y2k__construction">🚧 UNDER CONSTRUCTION 🚧</div>

        {/* ── LOGIN (minimum) ── */}
        {supported ? (
          <button
            type="button"
            className="y2k__login"
            onClick={handleLogin}
            disabled={busy}
            aria-label="Zaloguj się kluczem passkey"
            aria-busy={busy}
          >
            {busy ? (
              <span className="y2k__login-busy">⏳ ...</span>
            ) : (
              <>🔑 LOGIN</>
            )}
          </button>
        ) : (
          <button type="button" className="y2k__login" disabled>
            🔑 BRAK PASSKEY
          </button>
        )}

        {error && (
          <div className="y2k__alert" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ── REJESTRACJA (minimum) ── */}
        <div className="y2k__divider" aria-hidden="true">
          ─ ✂ ─ ✂ ─
        </div>

        <button
          type="button"
          className="y2k__toggle"
          onClick={() => setRegOpen((v) => !v)}
          aria-expanded={regOpen}
          aria-controls="y2k-register"
        >
          {regOpen ? "▲ REJESTRACJA" : "🆕 REJESTRACJA ▼"}
        </button>

        {regOpen && (
          <section id="y2k-register" className="y2k__register">
            <input
              className="y2k__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nazwa"
              maxLength={64}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={!supported || regBusy}
              aria-label="Nazwa użytkownika"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRegister();
              }}
            />
            <button
              type="button"
              className="y2k__login y2k__login--reg"
              onClick={handleRegister}
              disabled={!supported || regBusy}
              aria-busy={regBusy}
            >
              {regBusy ? (
                <span className="y2k__login-busy">⏳ ...</span>
              ) : (
                <>🔐 REJESTRUJ</>
              )}
            </button>

            {regError && (
              <div className="y2k__alert" role="alert">
                ⚠️ {regError}
              </div>
            )}

            {enrollment && (
              <div className="y2k__enroll">
                <textarea
                  ref={enrollRef}
                  className="y2k__enrollment"
                  readOnly
                  rows={5}
                  value={enrollment}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Kod rejestracyjny"
                />
                <button
                  type="button"
                  className="y2k__login y2k__login--copy"
                  onClick={handleCopy}
                >
                  {copied ? "✅ OK" : "📋 KOPIUJ"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ═══════════ BLOAT bez związku ze stroną ═══════════ */}

        {/* Now playing MIDI */}
        <div className="y2k__nowplaying">
          <span className="y2k__eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          ♫ Teraz gra: <b>tetris_theme.mid</b> ♫
        </div>

        {/* Fake weather */}
        <div className="y2k__weather">
          ⛅ POGODA: Wrocław 21°C, wiatr 3 m/s <i>(dane z 1999)</i>
        </div>

        {/* Fake ticker */}
        <div className="y2k__ticker">
          <div className="y2k__ticker-track">
            🚌 LINIA 4: za -3 min ••• 🚌 LINIA 33: OPÓŹNIONA ••• 💾 wolne miejsce
            na dysku: 640 KB ••• 🕹️ rekord w Sapera: 003 ••• 📈 kurs dyskietki: 2,50
            zł ••• 🚌 LINIA 4: za -3 min ••• 🚌 LINIA 33: OPÓŹNIONA ••• 💾 wolne
            miejsce na dysku: 640 KB •••
          </div>
        </div>

        {/* Hit counter */}
        <div className="y2k__counter">
          <span className="y2k__counter-label">Odwiedziny:</span>
          <span className="y2k__odometer">
            {"00013377".split("").map((d, i) => (
              <span key={i} className="y2k__digit">
                {d}
              </span>
            ))}
          </span>
        </div>

        {/* Award badges */}
        <div className="y2k__awards" aria-hidden="true">
          <span className="y2k__award y2k__award--ns">Netscape NOW!</span>
          <span className="y2k__award y2k__award--best">Best viewed 800×600</span>
          <span className="y2k__award y2k__award--y2k">Y2K COMPLIANT</span>
          <span className="y2k__award y2k__award--np">Made with Notepad</span>
          <span className="y2k__award y2k__award--html">HTML 3.2</span>
        </div>

        {/* Guestbook */}
        <nav className="y2k__guestbook" aria-label="Księga gości (dekoracyjna)">
          <span className="y2k__gb-link">✍️ PODPISZ KSIĘGĘ GOŚCI</span>
          <span className="y2k__gb-link">📖 CZYTAJ KSIĘGĘ</span>
          <span className="y2k__gb-link">📧 EMAIL DO WEBMASTERA</span>
        </nav>

        {/* Webring */}
        <nav className="y2k__webring" aria-label="Webring (dekoracyjny)">
          <span className="y2k__ring-link">« POPRZEDNI</span>
          <span className="y2k__ring-sep">|</span>
          <span className="y2k__ring-link">🚌 HUB</span>
          <span className="y2k__ring-sep">|</span>
          <span className="y2k__ring-link">NASTĘPNY »</span>
        </nav>

        <p className="y2k__stars" aria-hidden="true">
          ★ ⭐ ✨ 🚌 💾 🔥 💿 📟 ✨ ⭐ ★
        </p>

        <footer className="y2k__footer">
          © 1999-2026 • Last updated: nigdy • 🇵🇱 🇩🇪 🇬🇧 goście z 3 krajów
        </footer>
      </div>

      <div className="y2k__marquee y2k__marquee--rev">
        <div className="y2k__marquee-track y2k__marquee-track--rev">
          {MARQUEE_BOT}
          {MARQUEE_BOT}
        </div>
      </div>
    </div>
  );
}

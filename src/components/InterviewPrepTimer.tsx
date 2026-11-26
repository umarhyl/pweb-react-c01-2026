import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";

const QUESTION_DURATION_SECONDS = 120;

const INTERVIEW_QUESTIONS: readonly string[] = [
  "Ceritakan bug tersulit saat mengelola state di proyek React yang pernah kamu buat, dan bagaimana kamu memperbaikinya?",
  "Apa perbedaan useState dan useRef di React, serta kapan kamu memilih salah satunya?",
  "Mengapa kita tidak boleh memutasi array atau object state secara langsung di React? Jelaskan dampaknya pada proses re-render.",
  "Bagaimana cara kamu menangani loading, error, dan pembatalan request (AbortController) saat melakukan fetch data dari REST API?",
  "Jelaskan keuntungan menggunakan TypeScript dengan strict mode dibandingkan JavaScript biasa saat bekerja dalam tim.",
  "Ceritakan pengalamanmu menyelesaikan konflik kode atau pembagian tugas di proyek tim dengan tenggat waktu ketat.",
];

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function playTimeUpChime(): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [660, 520];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      gain.gain.setValueAtTime(0.08, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.26);
    });
  } catch {
    // Abaikan jika audio context diblokir kebijakan autoplay browser
  }
}

export function InterviewPrepTimer() {
  const speechAvailable = isSpeechSupported();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(speechAvailable);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceEnabledRef = useRef(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const stopSpeech = useCallback(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakQuestion = useCallback(
    (index: number) => {
      if (!isSpeechSupported()) return;

      window.speechSynthesis.cancel();
      const text = `Pertanyaan nomor ${index + 1}. ${INTERVIEW_QUESTIONS[index]}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.98;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith("id"),
      );
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  // Cleanup speechSynthesis ketika panel ditutup (unmount)
  useEffect(() => {
    return () => {
      if (isSpeechSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isActivelyRunning = isRunning && secondsLeft > 0;

  // Wajib cleanup clearInterval agar tidak bocor saat panel ditutup (unmount)
  useEffect(() => {
    if (!isActivelyRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActivelyRunning]);

  // Bunyikan chime sekali secara bersih saat waktu habis (00:00)
  useEffect(() => {
    if (isRunning && secondsLeft === 0 && voiceEnabledRef.current) {
      playTimeUpChime();
    }
  }, [isRunning, secondsLeft]);

  const handleToggleRun = () => {
    if (isActivelyRunning) {
      setIsRunning(false);
      stopSpeech();
      return;
    }

    const startingFresh =
      secondsLeft === 0 || secondsLeft === QUESTION_DURATION_SECONDS;

    if (secondsLeft === 0) {
      setSecondsLeft(QUESTION_DURATION_SECONDS);
    }
    setIsRunning(true);

    if (voiceEnabled && startingFresh) {
      speakQuestion(questionIndex);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    stopSpeech();
  };

  const handleNextQuestion = () => {
    const nextIdx = (questionIndex + 1) % INTERVIEW_QUESTIONS.length;
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionIndex(nextIdx);
    if (voiceEnabled) {
      speakQuestion(nextIdx);
    } else {
      stopSpeech();
    }
  };

  const handlePrevQuestion = () => {
    const prevIdx =
      (questionIndex - 1 + INTERVIEW_QUESTIONS.length) %
      INTERVIEW_QUESTIONS.length;
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionIndex(prevIdx);
    if (voiceEnabled) {
      speakQuestion(prevIdx);
    } else {
      stopSpeech();
    }
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next) {
      stopSpeech();
    }
  };

  const progressPercent = Math.round(
    (secondsLeft / QUESTION_DURATION_SECONDS) * 100,
  );
  const isTimeUp = secondsLeft === 0;
  const isLowTime = secondsLeft > 0 && secondsLeft <= 30;

  return (
    <section className="craft-card p-4.5 space-y-3.5" aria-label="Latihan Interview">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <span className="inline-flex items-center gap-1.5 craft-eyebrow text-leaf-deep">
          <img
            src={RETRO_ICONS.timer}
            alt=""
            width={16}
            height={16}
            className="pixel-art"
          />
          Latihan Interview
        </span>
        <div className="flex items-center gap-1.5">
          {speechAvailable && (
            <button
              type="button"
              onClick={handleToggleVoice}
              title={
                voiceEnabled
                  ? "Matikan suara pewawancara"
                  : "Aktifkan suara pewawancara"
              }
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${
                voiceEnabled
                  ? "bg-sky-soft text-sky-deep border-sky"
                  : "bg-cream-soft text-muted border-line"
              }`}
            >
              {voiceEnabled ? (
                <Volume2 className="w-3 h-3" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3 h-3" aria-hidden="true" />
              )}
              {voiceEnabled ? "Suara ON" : "Suara OFF"}
            </button>
          )}
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cream-soft border border-line text-muted">
            Soal {questionIndex + 1} / {INTERVIEW_QUESTIONS.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <blockquote className="text-xs sm:text-[13px] text-ink bg-sky-soft/65 border-l-4 border-leaf rounded-r-xl p-3.5 leading-relaxed">
          &ldquo;{INTERVIEW_QUESTIONS[questionIndex]}&rdquo;
        </blockquote>

        {speechAvailable && (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted">
              {isSpeaking
                ? "Pewawancara sedang membacakan soal..."
                : "Klik Bacakan untuk simulasi ditanya langsung."}
            </span>
            <button
              type="button"
              onClick={() =>
                isSpeaking ? stopSpeech() : speakQuestion(questionIndex)
              }
              className="inline-flex items-center gap-1 font-semibold text-leaf hover:underline cursor-pointer shrink-0"
            >
              <Volume2 className="w-3 h-3" aria-hidden="true" />
              {isSpeaking ? "Hentikan Suara" : "Bacakan Soal"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div
            className={`font-retro text-5xl leading-none tracking-wider ${
              isTimeUp
                ? "text-danger"
                : isLowTime
                  ? "text-warn"
                  : "text-leaf-deep"
            }`}
            aria-live="polite"
          >
            {formatCountdown(secondsLeft)}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleRun}
              className={`craft-btn py-1.5 px-3.5 ${isActivelyRunning ? "" : "craft-btn-primary"}`}
            >
              {isActivelyRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  Jeda
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  {isTimeUp ? "Mulai Ulang" : "Mulai"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="craft-btn py-1.5 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>

            <button
              type="button"
              onClick={handlePrevQuestion}
              aria-label="Soal sebelumnya"
              className="craft-btn p-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="craft-btn py-1.5 px-3"
            >
              Lanjut
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="craft-progress"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sisa waktu latihan interview"
        >
          <div
            className="craft-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isTimeUp && (
          <p className="text-[11.5px] font-semibold text-danger">
            Waktu 02:00 habis! Klik Reset atau lanjut ke soal berikutnya.
          </p>
        )}
      </div>
    </section>
  );
}

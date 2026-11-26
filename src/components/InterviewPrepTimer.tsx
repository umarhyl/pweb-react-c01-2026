import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Timer } from "lucide-react";

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
  return `${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

export function InterviewPrepTimer() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  // Wajib cleanup clearInterval agar tidak bocor saat panel ditutup (unmount)
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const handleToggleRun = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(QUESTION_DURATION_SECONDS);
      setIsRunning(true);
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
  };

  const handleNextQuestion = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionIndex((prev) => (prev + 1) % INTERVIEW_QUESTIONS.length);
  };

  const handlePrevQuestion = () => {
    setIsRunning(false);
    setSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionIndex(
      (prev) =>
        (prev - 1 + INTERVIEW_QUESTIONS.length) % INTERVIEW_QUESTIONS.length,
    );
  };

  const progressPercent = Math.round(
    (secondsLeft / QUESTION_DURATION_SECONDS) * 100,
  );
  const isTimeUp = secondsLeft === 0;
  const isLowTime = secondsLeft > 0 && secondsLeft <= 30;

  return (
    <section className="xp-paper p-3.5 space-y-3" aria-label="Latihan Interview">
      <div className="flex items-center justify-between gap-2 border-b border-xp-cream-border pb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-xp-deep">
          <Timer className="w-4 h-4" aria-hidden="true" />
          Latihan Interview
        </span>
        <span className="font-mono text-xs font-bold text-slate-600">
          Soal {questionIndex + 1} / {INTERVIEW_QUESTIONS.length}
        </span>
      </div>

      <blockquote className="text-xs sm:text-sm text-xp-ink bg-xp-cream/60 border-l-4 border-xp-bar p-2.5 leading-relaxed">
        &ldquo;{INTERVIEW_QUESTIONS[questionIndex]}&rdquo;
      </blockquote>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div
            className={`font-mono text-2xl sm:text-3xl font-bold tracking-wider ${
              isTimeUp
                ? "text-xp-danger"
                : isLowTime
                  ? "text-amber-700"
                  : "text-xp-deep"
            }`}
            aria-live="polite"
          >
            {formatCountdown(secondsLeft)}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleRun}
              className={`xp-btn ${isRunning ? "" : "xp-btn-green"}`}
            >
              {isRunning ? (
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

            <button type="button" onClick={handleReset} className="xp-btn">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>

            <button
              type="button"
              onClick={handlePrevQuestion}
              aria-label="Soal sebelumnya"
              className="xp-btn px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="xp-btn"
            >
              Soal Berikutnya
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="w-full h-2 bg-xp-cream border border-xp-border overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sisa waktu latihan interview"
        >
          <div
            className={`h-full transition-all duration-300 ${
              isTimeUp
                ? "bg-xp-danger"
                : isLowTime
                  ? "bg-xp-warn"
                  : "bg-xp-bar"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isTimeUp && (
          <p className="text-[11px] font-bold text-xp-danger">
            Waktu 02:00 habis! Klik Reset atau lanjut ke Soal Berikutnya.
          </p>
        )}
      </div>
    </section>
  );
}

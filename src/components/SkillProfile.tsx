import { useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { RETRO_ICONS } from "../assets/retro";
import type { JobDataSource } from "../types";
import { hasDuplicateSkill } from "../utils";

interface SkillProfileProps {
  skills: readonly string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  dataSource: JobDataSource;
  onChangeDataSource: (source: JobDataSource) => void;
}

export function SkillProfile({
  skills,
  onAddSkill,
  onRemoveSkill,
  dataSource,
  onChangeDataSource,
}: SkillProfileProps) {
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = skillInput.trim();

    if (trimmed.length === 0) {
      setError("Nama skill tidak boleh kosong.");
      return;
    }

    if (hasDuplicateSkill(skills, trimmed)) {
      setError(`Skill "${trimmed}" sudah ada di profil.`);
      return;
    }

    onAddSkill(trimmed);
    setSkillInput("");
    setError(null);
  };

  return (
    <aside className="space-y-5">
      {/* Editorial Card 1: Profil Skill Kapten */}
      <section className="xp-paper p-5 space-y-4" aria-label="Profil Skill Kapten">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="xp-eyebrow">PROFIL_SKILL.TXT</span>
            <span className="font-mono text-[11px] font-bold text-xp-deep bg-xp-soft px-2 py-0.5 border border-xp-border">
              {skills.length} skill
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-xp-deep flex items-center gap-2">
            <img
              src={RETRO_ICONS.skill}
              alt=""
              width={18}
              height={18}
              className="xp-pixel shrink-0"
            />
            Skill Kapten
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dipakai untuk menghitung <strong>Skill Match %</strong> setiap
            lowongan secara langsung.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2" noValidate>
          <div className="flex gap-2">
            <label htmlFor="kapten-skill-input" className="sr-only">
              Tambah skill Kapten
            </label>
            <input
              id="kapten-skill-input"
              type="text"
              value={skillInput}
              onChange={(e) => {
                setSkillInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tambah skill (mis. Docker)..."
              className="xp-input flex-1 text-xs"
            />
            <button
              type="submit"
              className="xp-btn xp-btn-green shrink-0 px-3"
            >
              Tambah
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[11px] font-bold text-xp-danger">
              {error}
            </p>
          )}
        </form>

        {skills.length === 0 ? (
          <p className="text-xs text-slate-600 italic bg-xp-cream/50 border border-dashed border-xp-border p-3">
            Belum ada skill. Tambahkan minimal 1 skill untuk menghitung kecocokan
            lowongan.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Daftar skill Kapten">
            {skills.map((skill) => (
              <li
                key={skill}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-xp-cream border border-xp-ink text-xp-ink"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill)}
                  aria-label={`Hapus skill ${skill}`}
                  className="text-slate-500 hover:text-xp-danger cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editorial Card 2: Sumber Data Lowongan */}
      <section className="xp-paper p-5 space-y-3.5" aria-label="Sumber Data Lowongan">
        <div className="space-y-1">
          <span className="xp-eyebrow">SUMBER_DATA.INI</span>
          <h2 className="font-display text-lg font-bold text-xp-deep flex items-center gap-2">
            <img
              src={RETRO_ICONS.folderOpen}
              alt=""
              width={18}
              height={18}
              className="xp-pixel shrink-0"
            />
            Sumber Lowongan
          </h2>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="sr-only">Pilih sumber data lowongan</legend>

          <label
            className={`flex items-start gap-2.5 p-3 border cursor-pointer transition-colors ${
              dataSource === "live"
                ? "bg-xp-soft/60 border-xp-deep"
                : "bg-xp-paper border-xp-cream-border hover:bg-xp-cream/50"
            }`}
          >
            <input
              type="radio"
              name="job-data-source"
              value="live"
              checked={dataSource === "live"}
              onChange={() => onChangeDataSource("live")}
              className="mt-0.5 accent-xp-bar"
            />
            <span className="text-xs leading-snug">
              <span className="font-bold block text-xp-deep">
                Remotive API (Live)
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                30 lowongan software-dev remote terbaru.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2.5 p-3 border cursor-pointer transition-colors ${
              dataSource === "fallback"
                ? "bg-xp-soft/60 border-xp-deep"
                : "bg-xp-paper border-xp-cream-border hover:bg-xp-cream/50"
            }`}
          >
            <input
              type="radio"
              name="job-data-source"
              value="fallback"
              checked={dataSource === "fallback"}
              onChange={() => onChangeDataSource("fallback")}
              className="mt-0.5 accent-xp-bar"
            />
            <span className="text-xs leading-snug">
              <span className="font-bold block text-xp-deep">
                Dataset Magang ID (Lokal)
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                15 lowongan magang tech Indonesia (offline-ready).
              </span>
            </span>
          </label>
        </fieldset>
      </section>
    </aside>
  );
}

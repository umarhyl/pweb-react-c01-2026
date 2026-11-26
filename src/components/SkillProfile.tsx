import { useState } from "react";
import type { FormEvent } from "react";
import { Database, Globe, Plus, Sparkles, X } from "lucide-react";
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
    <aside className="space-y-4">
      <section className="xp-window" aria-label="Profil Skill Kapten">
        <div className="xp-titlebar">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Profil Skill Kapten
          </span>
          <span className="font-mono text-[11px] bg-xp-deep/70 px-1.5 py-0.5 rounded-sm">
            {skills.length} skill
          </span>
        </div>

        <div className="p-3.5 space-y-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            Digunakan untuk menghitung <strong>Skill Match %</strong> tiap
            lowongan secara langsung.
          </p>

          <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
            <div className="flex gap-1.5">
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
                className="xp-btn xp-btn-green shrink-0 px-2.5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Tambah
              </button>
            </div>

            {error && (
              <p role="alert" className="text-[11px] font-bold text-red-700">
                {error}
              </p>
            )}
          </form>

          {skills.length === 0 ? (
            <p className="text-xs text-slate-600 italic bg-xp-paper border border-dashed border-xp-border p-2.5">
              Belum ada skill. Tambahkan minimal 1 skill untuk melihat kecocokan
              lowongan.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Daftar skill Kapten">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-xp-paper border border-xp-border text-xp-ink"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSkill(skill)}
                    aria-label={`Hapus skill ${skill}`}
                    className="p-0.5 text-slate-500 hover:text-xp-danger cursor-pointer"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="xp-window" aria-label="Sumber Data Lowongan">
        <div className="xp-titlebar">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            Sumber Data Lowongan
          </span>
        </div>

        <fieldset className="p-3.5 space-y-2">
          <legend className="sr-only">Pilih sumber data lowongan</legend>

          <label className="flex items-start gap-2.5 p-2 bg-xp-paper border border-xp-border cursor-pointer hover:bg-xp-soft/50">
            <input
              type="radio"
              name="job-data-source"
              value="live"
              checked={dataSource === "live"}
              onChange={() => onChangeDataSource("live")}
              className="mt-0.5 accent-xp-bar"
            />
            <span className="text-xs leading-snug">
              <span className="font-bold flex items-center gap-1 text-xp-deep">
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                Remotive API (Live)
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                30 lowongan software-dev remote terbaru.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2 bg-xp-paper border border-xp-border cursor-pointer hover:bg-xp-soft/50">
            <input
              type="radio"
              name="job-data-source"
              value="fallback"
              checked={dataSource === "fallback"}
              onChange={() => onChangeDataSource("fallback")}
              className="mt-0.5 accent-xp-bar"
            />
            <span className="text-xs leading-snug">
              <span className="font-bold flex items-center gap-1 text-xp-deep">
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
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

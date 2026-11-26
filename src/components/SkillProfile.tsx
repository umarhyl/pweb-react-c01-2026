import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, X } from "lucide-react";
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
    <aside className="space-y-4">
      {/* Card 1: Profil Skill Kapten */}
      <section
        className="craft-card p-5 space-y-4"
        aria-label="Profil Skill Kapten"
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="craft-eyebrow">Skill Inventory</span>
            <span className="text-[11px] font-semibold text-leaf-deep bg-leaf-soft px-2.5 py-0.5 rounded-full border border-leaf/30">
              {skills.length} skill
            </span>
          </div>
          <h2 className="font-pixel text-xl font-bold text-ink flex items-center gap-2">
            <img
              src={RETRO_ICONS.skill}
              alt=""
              width={18}
              height={18}
              className="pixel-art shrink-0"
            />
            Skill Kapten
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Dipakai untuk menghitung <strong>Skill Match %</strong> setiap
            lowongan secara live.
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
              placeholder="Mis. Docker, Next.js..."
              className="craft-input flex-1 text-xs"
            />
            <button
              type="submit"
              className="craft-btn craft-btn-primary shrink-0 px-3.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Tambah
            </button>
          </div>

          {error && (
            <p role="alert" className="text-[11.5px] font-medium text-danger">
              {error}
            </p>
          )}
        </form>

        {skills.length === 0 ? (
          <p className="text-xs text-muted italic bg-cream-soft border border-dashed border-line-strong rounded-xl p-3">
            Belum ada skill. Tambahkan minimal 1 skill untuk menghitung kecocokan
            lowongan.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Daftar skill Kapten">
            {skills.map((skill) => (
              <li
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-cream-soft border border-line-strong/80 text-ink rounded-full"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill)}
                  aria-label={`Hapus skill ${skill}`}
                  className="text-muted hover:text-danger transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Card 2: Sumber Data Lowongan */}
      <section
        className="craft-card p-5 space-y-3.5"
        aria-label="Sumber Data Lowongan"
      >
        <div className="space-y-1">
          <span className="craft-eyebrow">Data Source</span>
          <h2 className="font-pixel text-lg font-bold text-ink flex items-center gap-2">
            <img
              src={RETRO_ICONS.folderOpen}
              alt=""
              width={18}
              height={18}
              className="pixel-art shrink-0"
            />
            Sumber Lowongan
          </h2>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="sr-only">Pilih sumber data lowongan</legend>

          <label
            className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
              dataSource === "live"
                ? "bg-leaf-soft/75 border-leaf shadow-xs"
                : "bg-white border-line hover:bg-cream-soft/70"
            }`}
          >
            <input
              type="radio"
              name="job-data-source"
              value="live"
              checked={dataSource === "live"}
              onChange={() => onChangeDataSource("live")}
              className="mt-0.5 accent-leaf"
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold block text-ink">
                Remotive API (Live)
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                30 lowongan software-dev remote terbaru.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
              dataSource === "fallback"
                ? "bg-leaf-soft/75 border-leaf shadow-xs"
                : "bg-white border-line hover:bg-cream-soft/70"
            }`}
          >
            <input
              type="radio"
              name="job-data-source"
              value="fallback"
              checked={dataSource === "fallback"}
              onChange={() => onChangeDataSource("fallback")}
              className="mt-0.5 accent-leaf"
            />
            <span className="text-xs leading-snug">
              <span className="font-semibold block text-ink">
                Dataset Magang ID (Lokal)
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                15 lowongan magang tech Indonesia (offline-ready).
              </span>
            </span>
          </label>
        </fieldset>
      </section>
    </aside>
  );
}

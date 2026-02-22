import type { BuildingKey, JobId } from "../types/types";

export const BUILDINGS = [
  {
    key: "seniors_fieldhouse_education",
    label: "Seniors / Fieldhouse / Education",
    jobIds: ["SW", "San", "Flo3"],
  },
  {
    key: "grade2_social",
    label: "Grade 2 / Social",
    jobIds: ["Vac", "Gar", "Flo1"],
  },
  { key: "grade1_annex", label: "Grade 1 / Annex", jobIds: ["Bath", "Flo2"] },
] as const satisfies ReadonlyArray<{
  key: BuildingKey;
  label: string;
  jobIds: readonly JobId[];
}>;

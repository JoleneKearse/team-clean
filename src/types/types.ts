import { BUILDINGS, CLEANERS, DAYS, JOBS } from "../constants/consts";

export type DayKey = (typeof DAYS)[number]["key"];
export type JobId = (typeof JOBS)[number];
export type BuildingKey = (typeof BUILDINGS)[number]["key"];
export type CleanerId = (typeof CLEANERS)[number];

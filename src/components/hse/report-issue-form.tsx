"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle, ImageIcon, MapPinned } from "@/components/ui/icons";
import { OBSERVATION_TYPE_LABELS, INCIDENT_TYPE_LABELS } from "@/lib/hse/status";
import { LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS } from "@/lib/hse/risk-matrix";

type ReportType = "hazard" | "incident" | "near-miss" | "observation";

const RECORD_TYPE_MAP: Record<ReportType, string> = {
  hazard: "HseHazard",
  incident: "HseIncident",
  "near-miss": "HseNearMiss",
  observation: "HseObservation",
};

const API_PATH: Record<ReportType, string> = {
  hazard: "/api/hse/hazards",
  incident: "/api/hse/incidents",
  "near-miss": "/api/hse/near-misses",
  observation: "/api/hse/observations",
};

const DETAIL_PATH: Record<ReportType, (id: string) => string> = {
  hazard: (id) => `/hse/hazards/${id}`,
  incident: (id) => `/hse/incidents/${id}`,
  "near-miss": (id) => `/hse/near-misses/${id}`,
  observation: (id) => `/hse/observations/${id}`,
};

/** The fastest safety-reporting interface in the application — a worker
 * should never need to understand HSE administration to use this. One
 * shared component adapts its fields to the selected report type, submits
 * to the real matching API, then attaches any captured photo to the newly
 * created record. */
export function ReportIssueForm({ type, projectId }: { type: ReportType; projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const [likelihood, setLikelihood] = useState("POSSIBLE");
  const [observationType, setObservationType] = useState<keyof typeof OBSERVATION_TYPE_LABELS>("UNSAFE_CONDITION");
  const [incidentType, setIncidentType] = useState<keyof typeof INCIDENT_TYPE_LABELS>("INJURY");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  async function submit() {
    setError(null);
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    if (type === "hazard" && !title.trim()) {
      setError("Hazard description is required.");
      return;
    }
    if (type !== "hazard" && (!title.trim() || !description.trim())) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    let body: Record<string, unknown>;
    if (type === "hazard") {
      body = {
        projectId,
        hazard: title,
        location,
        initialLikelihood: likelihood,
        initialSeverity: severity,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };
    } else if (type === "incident") {
      body = {
        projectId,
        type: incidentType,
        title,
        description,
        location,
        severity,
        incidentDate,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };
    } else if (type === "near-miss") {
      body = {
        projectId,
        title,
        description,
        location,
        potentialSeverity: severity,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };
    } else {
      body = {
        projectId,
        type: observationType,
        title,
        description,
        location,
        severity,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };
    }

    const res = await fetch(API_PATH[type], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSubmitting(false);
      setError(result.error ?? "Failed to submit the report.");
      return;
    }

    if (photo) {
      const form = new FormData();
      form.set("recordType", RECORD_TYPE_MAP[type]);
      form.set("recordId", result.id);
      form.set("file", photo);
      await fetch("/api/hse/attachments", { method: "POST", body: form }).catch(() => null);
    }

    setSubmitting(false);
    router.push(DETAIL_PATH[type](result.id));
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Issue Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        {type === "observation" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Type
            <Select value={observationType} onChange={(e) => setObservationType(e.target.value as never)}>
              {Object.entries(OBSERVATION_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
        )}
        {type === "incident" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Type
              <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value as never)}>
                {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Incident Date
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          {type === "hazard" ? "Hazard *" : "Title *"}
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Briefly describe it" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Location *
          <div className="flex gap-2">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Level 02, North Facade" className="flex-1" />
            <Button type="button" variant="secondary" size="sm" onClick={useMyLocation} disabled={locating}>
              <MapPinned size={13} />
              {locating ? "Locating…" : coords ? "Located" : "Use My Location"}
            </Button>
          </div>
        </label>
      </div>

      {type !== "hazard" && (
        <>
          <SectionHeader>Description</SectionHeader>
          <div className="px-4 py-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              What happened? *
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
          </div>
        </>
      )}

      <SectionHeader>Risk</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          {type === "near-miss" ? "Potential Severity" : "Severity"}
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </label>
        {type === "hazard" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Likelihood
            <Select value={likelihood} onChange={(e) => setLikelihood(e.target.value)}>
              {LIKELIHOOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </label>
        )}
      </div>

      <SectionHeader>Evidence</SectionHeader>
      <div className="px-4 py-3">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => photoInputRef.current?.click()}>
          <ImageIcon size={13} />
          {photo ? photo.name : "Take / Upload Photo"}
        </Button>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Report"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { type WebhookFormat, useWebhookForm } from "../model/use-webhook-form";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const FORMAT_LABELS: Record<WebhookFormat, string> = {
  generic: "汎用 JSON",
  discord: "Discord",
};

const FORMAT_OPTIONS: readonly WebhookFormat[] = ["generic", "discord"];

const isWebhookFormat = (value: string): value is WebhookFormat =>
  value === "generic" || value === "discord";

const formatLabel = (value: unknown): string => {
  if (typeof value === "string" && isWebhookFormat(value)) {
    return FORMAT_LABELS[value];
  }
  return "形式を選択";
};

interface TextFieldProps {
  id: string;
  label: string;
  type: "text" | "url";
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
}

const TextField = ({ id, label, type, value, placeholder, onValueChange }: TextFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      placeholder={placeholder}
      required
    />
  </div>
);

interface FormatFieldProps {
  value: WebhookFormat;
  onValueChange: (value: WebhookFormat) => void;
}

const FormatField = ({ value, onValueChange }: FormatFieldProps) => {
  const handleChange = (next: string | null) => {
    if (next !== null && isWebhookFormat(next)) {
      onValueChange(next);
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="webhook-format">形式</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="webhook-format" className="w-full">
          <SelectValue>{formatLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FORMAT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {FORMAT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const WebhookForm = () => {
  const form = useWebhookForm();

  const handleNameChange = (value: string) => {
    form.setName(value);
  };
  const handleUrlChange = (value: string) => {
    form.setUrl(value);
  };
  const handleFormatChange = (value: WebhookFormat) => {
    form.setFormat(value);
  };

  return (
    <form action={form.submit} className="flex flex-col gap-3 rounded-lg border p-4">
      <TextField
        id="webhook-name"
        label="名前"
        type="text"
        value={form.name}
        placeholder="例: My Discord"
        onValueChange={handleNameChange}
      />
      <TextField
        id="webhook-url"
        label="URL"
        type="url"
        value={form.url}
        placeholder="https://..."
        onValueChange={handleUrlChange}
      />
      <FormatField value={form.format} onValueChange={handleFormatChange} />
      {form.errorMessage !== "" && <p className="text-sm text-destructive">{form.errorMessage}</p>}
      <div>
        <Button type="submit" disabled={form.submitting}>
          {form.submitting ? "追加中..." : "Webhook を追加"}
        </Button>
      </div>
    </form>
  );
};

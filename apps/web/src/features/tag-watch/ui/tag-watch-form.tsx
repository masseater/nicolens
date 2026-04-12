"use client";

import Link from "next/link";

import { useTagWatchForm } from "../model/use-tag-watch-form";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;

export interface WebhookOption {
  id: string;
  name: string;
}

interface TagWatchFormProps {
  webhooks: readonly WebhookOption[];
}

interface TagFieldProps {
  value: string;
  onValueChange: (value: string) => void;
}

const TagField = ({ value, onValueChange }: TagFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="tag-watch-tag">タグ</Label>
    <Input
      id="tag-watch-tag"
      type="text"
      value={value}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      placeholder="例: VOCALOID"
      required
    />
  </div>
);

interface WebhookFieldProps {
  value: string;
  webhooks: readonly WebhookOption[];
  onValueChange: (value: string) => void;
}

const WebhookField = ({ value, webhooks, onValueChange }: WebhookFieldProps) => {
  const handleChange = (next: string | null) => {
    if (next !== null) {
      onValueChange(next);
    }
  };
  const labelMap = new Map(webhooks.map((webhook) => [webhook.id, webhook.name]));
  const renderLabel = (current: unknown): string => {
    if (typeof current === "string") {
      return labelMap.get(current) ?? "Webhook を選択";
    }
    return "Webhook を選択";
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="tag-watch-webhook">通知先 Webhook</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="tag-watch-webhook" className="w-full">
          <SelectValue>{renderLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {webhooks.map((webhook) => (
            <SelectItem key={webhook.id} value={webhook.id}>
              {webhook.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const EmptyWebhooksMessage = () => (
  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
    まず{" "}
    <Link href="/webhooks" className="underline underline-offset-4">
      Webhooks ページ
    </Link>{" "}
    で webhook を登録してください
  </div>
);

export const TagWatchForm = ({ webhooks }: TagWatchFormProps) => {
  const initialWebhookId = webhooks[FIRST_INDEX]?.id ?? "";
  const form = useTagWatchForm(initialWebhookId);

  if (webhooks.length === EMPTY_LENGTH) {
    return <EmptyWebhooksMessage />;
  }

  const handleTagChange = (value: string) => {
    form.setTag(value);
  };
  const handleWebhookChange = (value: string) => {
    form.setWebhookId(value);
  };

  return (
    <form action={form.submit} className="flex flex-col gap-3 rounded-lg border p-4">
      <TagField value={form.tag} onValueChange={handleTagChange} />
      <WebhookField
        value={form.webhookId}
        webhooks={webhooks}
        onValueChange={handleWebhookChange}
      />
      {form.errorMessage !== "" && <p className="text-sm text-destructive">{form.errorMessage}</p>}
      <div>
        <Button type="submit" disabled={form.submitting}>
          {form.submitting ? "追加中..." : "タグ監視を追加"}
        </Button>
      </div>
    </form>
  );
};

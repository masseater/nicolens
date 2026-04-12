"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SubmitInput {
  tag: string;
  webhookId: string;
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const data: unknown = await response.json().catch(() => null);
  if (typeof data === "object" && data !== null && "error" in data) {
    const { error } = data as { error: unknown }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- safe after object/in check
    if (typeof error === "string") {
      return error;
    }
  }
  return "タグ監視の作成に失敗しました";
};

const submitTagWatch = async (input: SubmitInput): Promise<string | undefined> => {
  const response = await fetch("/api/watches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return parseErrorMessage(response);
  }
  return undefined;
};

const tryCreateTagWatch = async (input: SubmitInput): Promise<string | undefined> => {
  try {
    return await submitTagWatch(input);
  } catch {
    return "通信に失敗しました";
  }
};

const validateInput = (state: SubmitInput): SubmitInput | string => {
  const trimmedTag = state.tag.trim();
  const trimmedWebhookId = state.webhookId.trim();
  if (trimmedTag === "") {
    return "タグを入力してください";
  }
  if (trimmedWebhookId === "") {
    return "Webhook を選択してください";
  }
  return { tag: trimmedTag, webhookId: trimmedWebhookId };
};

export interface UseTagWatchForm {
  tag: string;
  webhookId: string;
  submitting: boolean;
  errorMessage: string;
  setTag: (value: string) => void;
  setWebhookId: (value: string) => void;
  submit: () => Promise<void>;
}

export const useTagWatchForm = (initialWebhookId: string): UseTagWatchForm => {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [webhookId, setWebhookId] = useState(initialWebhookId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setTag("");
    setWebhookId(initialWebhookId);
  };

  const runSubmit = async (input: SubmitInput): Promise<string | undefined> => {
    setSubmitting(true);
    setErrorMessage("");
    const error = await tryCreateTagWatch(input);
    setSubmitting(false);
    return error;
  };

  const submit = async () => {
    const validated = validateInput({ tag, webhookId });
    if (typeof validated === "string") {
      setErrorMessage(validated);
      return;
    }
    const error = await runSubmit(validated);
    if (error !== undefined) {
      setErrorMessage(error);
      return;
    }
    resetForm();
    router.refresh();
  };

  return { tag, webhookId, submitting, errorMessage, setTag, setWebhookId, submit };
};

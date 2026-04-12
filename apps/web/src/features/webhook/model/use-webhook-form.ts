"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type WebhookFormat = "discord" | "generic";

interface SubmitInput {
  name: string;
  url: string;
  format: WebhookFormat;
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const data: unknown = await response.json().catch(() => null);
  if (typeof data === "object" && data !== null && "error" in data) {
    const { error } = data as { error: unknown }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- safe after object/in check
    if (typeof error === "string") {
      return error;
    }
  }
  return "Webhook の作成に失敗しました";
};

const submitWebhook = async (input: SubmitInput): Promise<string | undefined> => {
  const response = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return parseErrorMessage(response);
  }
  return undefined;
};

const tryCreateWebhook = async (input: SubmitInput): Promise<string | undefined> => {
  try {
    return await submitWebhook(input);
  } catch {
    return "通信に失敗しました";
  }
};

const validateInput = (state: SubmitInput): SubmitInput | string => {
  const trimmedName = state.name.trim();
  const trimmedUrl = state.url.trim();
  if (trimmedName === "" || trimmedUrl === "") {
    return "名前と URL を入力してください";
  }
  return { name: trimmedName, url: trimmedUrl, format: state.format };
};

export interface UseWebhookForm {
  name: string;
  url: string;
  format: WebhookFormat;
  submitting: boolean;
  errorMessage: string;
  setName: (value: string) => void;
  setUrl: (value: string) => void;
  setFormat: (value: WebhookFormat) => void;
  submit: () => Promise<void>;
}

export const useWebhookForm = (): UseWebhookForm => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<WebhookFormat>("generic");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setName("");
    setUrl("");
    setFormat("generic");
  };

  const runSubmit = async (input: SubmitInput): Promise<string | undefined> => {
    setSubmitting(true);
    setErrorMessage("");
    const error = await tryCreateWebhook(input);
    setSubmitting(false);
    return error;
  };

  const submit = async () => {
    const validated = validateInput({ name, url, format });
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

  return { name, url, format, submitting, errorMessage, setName, setUrl, setFormat, submit };
};

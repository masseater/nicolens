import { validateWebhookUrl } from "./url-validator";
import { formatDiscord, formatGeneric } from "./webhook-formats";

interface SendParams {
  url: string;
  format: string;
  payloadStr: string;
}

interface SendResult {
  success: boolean;
}

const buildBody = (format: string, payloadStr: string): string | undefined => {
  try {
    const payload = format === "discord" ? formatDiscord(payloadStr) : formatGeneric(payloadStr);
    return JSON.stringify(payload);
  } catch {
    return undefined;
  }
};

const postBody = async (url: string, body: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const sendWebhook = async (params: SendParams): Promise<SendResult> => {
  if (!validateWebhookUrl(params.url)) {
    return { success: false };
  }
  const body = buildBody(params.format, params.payloadStr);
  if (body === undefined) {
    return { success: false };
  }
  const ok = await postBody(params.url, body);
  return { success: ok };
};

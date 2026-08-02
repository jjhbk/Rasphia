const SARVAM_API_BASE = process.env.SARVAM_API_BASE?.trim() || "https://api.sarvam.ai";
const SARVAM_API_KEY =
  process.env.SARVAM_API_KEY?.trim() || process.env.SARVAM_API_SUBSCRIPTION_KEY?.trim() || "";

const DEFAULT_STT_MODEL = process.env.SARVAM_STT_MODEL?.trim() || "saaras:v3";
const DEFAULT_STT_MODE = process.env.SARVAM_STT_MODE?.trim() || "transcribe";
const DEFAULT_TTS_MODEL = process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
const DEFAULT_TTS_SPEAKER = process.env.SARVAM_TTS_SPEAKER?.trim() || "shubh";
const DEFAULT_TTS_SAMPLE_RATE = Number(process.env.SARVAM_TTS_SAMPLE_RATE || 24000);
const DEFAULT_TTS_FORMAT = process.env.SARVAM_TTS_FORMAT?.trim() || "mp3";
const DEFAULT_TTS_FALLBACK_LANGUAGE =
  process.env.SARVAM_TTS_FALLBACK_LANGUAGE?.trim() || "en-IN";
const DEFAULT_TRANSLATE_MODEL =
  process.env.SARVAM_TRANSLATE_MODEL?.trim() || "mayura:v1";

export const SUPPORTED_TTS_LANGUAGES = new Set([
  "en-IN",
  "hi-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "gu-IN",
  "pa-IN",
  "od-IN",
]);

type SarvamErrorShape = {
  error?: {
    message?: string;
    code?: string;
    request_id?: string;
  };
};

export type SarvamSpeechToTextResult = {
  transcript: string;
  languageCode: string;
  requestId?: string;
};

export type SarvamTextToSpeechResult = {
  audio: Buffer;
  audioFormat: string;
  languageCode: string;
  requestId?: string;
};

export type SarvamTranslateResult = {
  translatedText: string;
  sourceLanguageCode: string;
  requestId?: string;
};

export type SarvamIdentifyLanguageResult = {
  languageCode: string;
  scriptCode?: string;
  requestId?: string;
};

function ensureSarvamKey() {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY is not configured.");
  }
}

async function parseSarvamError(response: Response) {
  let body = "";

  try {
    const json = (await response.json()) as SarvamErrorShape;
    if (json?.error?.message) {
      body = json.error.message;
      if (json.error.code) {
        body = `${json.error.code}: ${body}`;
      }
    } else {
      body = JSON.stringify(json);
    }
  } catch {
    body = await response.text();
  }

  return body || `Sarvam API request failed with status ${response.status}`;
}

function inferFilenameFromMimeType(mimeType: string) {
  if (mimeType.includes("ogg")) return "voice-note.ogg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "voice-note.mp3";
  if (mimeType.includes("wav")) return "voice-note.wav";
  if (mimeType.includes("aac")) return "voice-note.aac";
  if (mimeType.includes("flac")) return "voice-note.flac";
  return "voice-note.bin";
}

function bufferToUint8Array(buffer: Buffer) {
  return Uint8Array.from(buffer);
}

function looksIndicScript(text: string) {
  return /[\u0900-\u0D7F]/.test(text);
}

export function resolveSarvamTtsLanguage(args: {
  replyText: string;
  detectedLanguageCode?: string;
}) {
  const detected = String(args.detectedLanguageCode || "").trim();
  if (SUPPORTED_TTS_LANGUAGES.has(detected) && looksIndicScript(args.replyText)) {
    return detected;
  }
  if (SUPPORTED_TTS_LANGUAGES.has(detected) && detected === "en-IN") {
    return detected;
  }
  return DEFAULT_TTS_FALLBACK_LANGUAGE;
}

export function isSarvamTtsLanguageSupported(languageCode?: string) {
  return SUPPORTED_TTS_LANGUAGES.has(String(languageCode || "").trim());
}

export async function identifyTextLanguageWithSarvam(input: string) {
  ensureSarvamKey();

  const response = await fetch(`${SARVAM_API_BASE}/text-lid`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
    }),
  });

  if (!response.ok) {
    const details = await parseSarvamError(response);
    throw new Error(`Sarvam text-lid failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as {
    request_id?: string;
    language_code?: string;
    script_code?: string;
  };

  const languageCode = String(data.language_code || "").trim();
  if (!languageCode) {
    throw new Error("Sarvam text-lid returned empty language code.");
  }

  return {
    languageCode,
    scriptCode: String(data.script_code || "").trim() || undefined,
    requestId: data.request_id,
  } satisfies SarvamIdentifyLanguageResult;
}

export async function transcribeAudioWithSarvam(args: {
  audio: Buffer;
  mimeType: string;
  filename?: string;
}) {
  ensureSarvamKey();

  const formData = new FormData();
  formData.set(
    "file",
    new Blob([bufferToUint8Array(args.audio)], {
      type: args.mimeType || "application/octet-stream",
    }),
    args.filename || inferFilenameFromMimeType(args.mimeType || "")
  );
  formData.set("model", DEFAULT_STT_MODEL);
  formData.set("mode", DEFAULT_STT_MODE);

  const response = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await parseSarvamError(response);
    throw new Error(`Sarvam speech-to-text failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as {
    request_id?: string;
    transcript?: string;
    language_code?: string;
  };

  const transcript = String(data.transcript || "").trim();
  if (!transcript) {
    throw new Error("Sarvam speech-to-text returned an empty transcript.");
  }

  return {
    transcript,
    languageCode: String(data.language_code || DEFAULT_TTS_FALLBACK_LANGUAGE).trim(),
    requestId: data.request_id,
  } satisfies SarvamSpeechToTextResult;
}

export async function synthesizeSpeechWithSarvam(args: {
  text: string;
  languageCode?: string;
  speaker?: string;
}) {
  ensureSarvamKey();

  const targetLanguageCode = resolveSarvamTtsLanguage({
    replyText: args.text,
    detectedLanguageCode: args.languageCode,
  });

  const response = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: args.text,
      target_language_code: targetLanguageCode,
      speaker: args.speaker || DEFAULT_TTS_SPEAKER,
      model: DEFAULT_TTS_MODEL,
      sample_rate: DEFAULT_TTS_SAMPLE_RATE,
      format: DEFAULT_TTS_FORMAT,
    }),
  });

  if (!response.ok) {
    const details = await parseSarvamError(response);
    throw new Error(`Sarvam text-to-speech failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as {
    request_id?: string;
    audios?: string[];
  };

  const combinedAudio = Array.isArray(data.audios) ? data.audios.join("") : "";
  if (!combinedAudio) {
    throw new Error("Sarvam text-to-speech returned no audio.");
  }

  return {
    audio: Buffer.from(combinedAudio, "base64"),
    audioFormat: DEFAULT_TTS_FORMAT,
    languageCode: targetLanguageCode,
    requestId: data.request_id,
  } satisfies SarvamTextToSpeechResult;
}

export async function translateTextWithSarvam(args: {
  input: string;
  targetLanguageCode: string;
  sourceLanguageCode?: string;
}) {
  ensureSarvamKey();

  const response = await fetch(`${SARVAM_API_BASE}/translate`, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: args.input,
      source_language_code: args.sourceLanguageCode?.trim() || "auto",
      target_language_code: args.targetLanguageCode,
      model: DEFAULT_TRANSLATE_MODEL,
    }),
  });

  if (!response.ok) {
    const details = await parseSarvamError(response);
    throw new Error(`Sarvam translate failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as {
    request_id?: string;
    translated_text?: string;
    source_language_code?: string;
  };

  const translatedText = String(data.translated_text || "").trim();
  if (!translatedText) {
    throw new Error("Sarvam translate returned empty text.");
  }

  return {
    translatedText,
    sourceLanguageCode: String(data.source_language_code || "auto").trim(),
    requestId: data.request_id,
  } satisfies SarvamTranslateResult;
}

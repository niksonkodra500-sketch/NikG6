export interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'brighten', label: 'Brighten', prompt: 'Make the photo brighter and more vivid.' },
  { id: 'warmer', label: 'Warmer', prompt: 'Make the photo warmer and cozier.' },
  { id: 'cooler', label: 'Cooler', prompt: 'Make the photo cooler and more refreshing.' },
  { id: 'dramatic', label: 'Dramatic', prompt: 'Make the photo more dramatic with higher contrast.' },
  { id: 'softer', label: 'Softer', prompt: 'Soften the photo with a gentle blur.' },
  { id: 'bw', label: 'Black & white', prompt: 'Convert the photo to black and white.' },
  { id: 'square', label: 'Square crop', prompt: 'Crop the photo to a square.' },
  { id: 'exposure', label: 'Fix exposure', prompt: 'Fix the exposure: balance brightness and contrast.' },
  { id: 'rotate', label: 'Rotate right', prompt: 'Rotate the photo 90 degrees clockwise.' },
];

export const SYSTEM_PROMPT = `You are the AI assistant inside NikG6 Photo Editor. Your job is to help the user edit their photo by calling the provided tools (adjust, apply_filter, crop, rotate, flip, resize, export_image, reset). When the user asks for an edit, call the appropriate tool(s) instead of only describing the edit. Keep your replies short and friendly. If the user asks something unrelated to photo editing, answer briefly and helpfully.`;

export interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'brighten', label: 'Brighten', prompt: 'Make the photo brighter and more vivid.' },
  { id: 'warmer', label: 'Warmer', prompt: 'Make the photo warmer and cozier.' },
  { id: 'cooler', label: 'Cooler', prompt: 'Make the photo cooler and more refreshing.' },
  {
    id: 'dramatic',
    label: 'Dramatic',
    prompt: 'Make the photo more dramatic with higher contrast.',
  },
  { id: 'softer', label: 'Softer', prompt: 'Soften the photo with a gentle blur.' },
  { id: 'bw', label: 'Black & white', prompt: 'Convert the photo to black and white.' },
  { id: 'square', label: 'Square crop', prompt: 'Crop the photo to a square.' },
  {
    id: 'exposure',
    label: 'Fix exposure',
    prompt: 'Fix the exposure: balance brightness and contrast.',
  },
  { id: 'rotate', label: 'Rotate right', prompt: 'Rotate the photo 90 degrees clockwise.' },
];

export const SYSTEM_PROMPT = `You are the AI assistant inside NikG6 Photo Editor. Your job is to help the user edit their photo by calling the provided tools (adjust, apply_filter, crop, crop_to_aspect, clear_crop, rotate, flip, resize, auto_enhance, apply_preset, reset, export_image, get_image_info, add_text, update_text, remove_text). When the user asks for an edit, call the appropriate tool(s) instead of only describing the edit. Keep your replies short and friendly. If the user asks something unrelated to photo editing, answer briefly and helpfully.

For complex editing requests, think step by step about what tools to use and in what order. Consider the user's intent and the current state of the photo. If unsure, ask clarifying questions before making changes.

Guidance:
- For "make it warmer/cooler/brighter/dramatic", use adjust or apply_preset.
- For "crop to a square / 16:9", use crop_to_aspect. For a freeform crop, use crop.
- For "add a caption / text", use add_text. To change existing text, use update_text with the overlay id returned by add_text.
- For "what size is this?", use get_image_info.
- Only call export_image when the user explicitly asks to save or export.
- When a tool fails, try an alternative approach or tell the user what went wrong.`;

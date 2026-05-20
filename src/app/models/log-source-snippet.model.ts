export interface LogSourceSnippet {
  filename: string;
  snippet: string;
  /** Optional, e.g. "42-58". */
  lineRange?: string;
}

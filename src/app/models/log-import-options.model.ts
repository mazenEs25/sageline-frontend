/**
 * Optional payload sent as the {@code "options"} multipart part of
 * {@code POST /preview-log} and {@code POST /import-log}.
 *
 * Mirrors backend {@code LogImportOptionsDTO}.
 */
export interface LogImportOptions {
  /**
   * If true, measures already present on the ticket will be overwritten with the
   * value parsed from the log. Default false — existing measures are reported under
   * {@code wouldOverwrite[]} on the response and left untouched.
   */
  overwriteExisting: boolean;
}

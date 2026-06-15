'use client';

import { useState, useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GuestEmailDialog } from '@/components/guest-email-dialog';
import { getGuestId } from '@/lib/guest-id';

interface UploadZoneProps {
  isLoggedIn: boolean;
}

interface ParseResult {
  success: boolean;
  columns: string[];
  rows: Record<string, string>[];
  warnings: { row: number; column: string; message: string }[];
  csv: string;
  error?: string;
}

type Stage = 'idle' | 'uploading' | 'parsing' | 'preview' | 'error';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.pdf'] as const;
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function UploadZone({ isLoggedIn }: UploadZoneProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [inlineError, setInlineError] = useState('');

  const handleUpload = useCallback(
    async (file: File) => {
      setInlineError('');

      // ── Frontend validation ──
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
        setInlineError('Please upload an Excel, CSV, or PDF quotation file.');
        return;
      }
      if (file.size > MAX_SIZE) {
        const sizeMB = formatFileSize(file.size);
        setInlineError(`File size must not exceed 10 MB. Your file is ${sizeMB}.`);
        return;
      }
      if (file.size === 0) {
        setInlineError('The file is empty. Please check the file content.');
        return;
      }

      setFileName(file.name);
      setStage('uploading');

      if (!isLoggedIn) {
        getGuestId();
      }

      const formData = new FormData();
      formData.append('file', file);

      setStage('parsing');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data: ParseResult = await res.json();

        if (!data.success) {
          setStage('error');
          setErrorMsg(data.error || 'Failed to parse the file.');
          return;
        }

        if (!data.rows || data.rows.length === 0) {
          setStage('error');
          setErrorMsg('No data found in the file. Please check the file content.');
          return;
        }

        setResult(data);
        setStage('preview');

        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((w) => toast.warning(w.message));
        }

        if (!isLoggedIn) {
          setShowEmailDialog(true);
        }
      } catch (err) {
        setStage('error');
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setErrorMsg('Network error. Please check your connection and try again.');
        } else {
          setErrorMsg('Something went wrong. Please try again or contact support.');
        }
      }
    },
    [isLoggedIn],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      // Handle dropzone-level rejections (type/size)
      if (rejections.length > 0) {
        const rejection = rejections[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          const sizeMB = formatFileSize(rejection.file.size);
          setInlineError(`File size must not exceed 10 MB. Your file is ${sizeMB}.`);
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setInlineError('Please upload an Excel, CSV, or PDF quotation file.');
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    [handleUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: MAX_SIZE,
    disabled: stage === 'uploading' || stage === 'parsing',
  });

  const handleEmailSubmit = (email: string) => {
    setGuestEmail(email);
    toast.success('Download link sent to ' + email);
  };

  const handleSkip = () => {
    setShowEmailDialog(false);
  };

  const handleDownload = () => {
    if (!result?.csv) return;
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName.replace(/\.[^.]+$/, '');
    a.download = `${baseName}_sheetsnap.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStage('idle');
    setResult(null);
    setFileName('');
    setShowEmailDialog(false);
    setGuestEmail(null);
    setErrorMsg('');
    setInlineError('');
  };

  // ── Render by stage ──

  if (stage === 'uploading' || stage === 'parsing') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-6 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {stage === 'uploading' ? 'Uploading…' : 'Parsing quotation…'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{fileName}</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="max-w-md rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-4 text-center">
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Try Again
        </Button>
      </div>
    );
  }

  if (stage === 'preview' && result) {
    return (
      <div className="flex w-full max-w-3xl flex-col items-center gap-4">
        {showEmailDialog && !guestEmail ? (
          <GuestEmailDialog onEmailSubmit={handleEmailSubmit} onSkip={handleSkip} />
        ) : (
          <>
            {/* Preview table */}
            <div className="w-full overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {result.columns.map((col) => (
                      <th key={col} className="px-3 py-2 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      {result.columns.map((col) => {
                        const val = row[col] || '';
                        const hasWarning = result.warnings?.some(
                          (w) => w.row === i && w.column === col,
                        );
                        return (
                          <td key={col} className="max-w-[200px] truncate px-3 py-2">
                            {hasWarning ? (
                              <span className="inline-flex items-center gap-1" title={val}>
                                <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-700">
                                  ⚠
                                </span>
                                {val}
                              </span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 10 && (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Showing first 10 of {result.rows.length} rows
                </p>
              )}
            </div>

            {/* Warnings area */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <p className="mb-1 font-medium">Warnings</p>
                {result.warnings.map((w, i) => (
                  <p key={i}>⚠ Row {w.row + 1}, {w.column}: {w.message}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button size="lg" onClick={handleDownload}>
                Download CSV
              </Button>
              <Button variant="outline" size="lg" onClick={handleReset}>
                Upload Another File
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Idle state with inline error support ──
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        {...getRootProps()}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        } ${
          inlineError ? 'border-destructive/50 bg-destructive/5' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            />
          </svg>
        </div>
        {isDragActive ? (
          <p className="text-sm font-medium">Drop your file here</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              <span className="text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx, .xls, .csv, .pdf &mdash; up to 10 MB
            </p>
          </>
        )}
      </div>

      {/* Inline error */}
      {inlineError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          <span className="text-base leading-none">!</span>
          <span>{inlineError}</span>
          <button
            type="button"
            onClick={() => setInlineError('')}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/types';

interface DropZoneProps {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function DropZone({
  onFileSelect,
  onFilesSelect,
  multiple = false,
  disabled = false,
  compact = false,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        if (multiple && onFilesSelect) {
          onFilesSelect(acceptedFiles);
        } else if (onFileSelect) {
          onFileSelect(acceptedFiles[0]);
        }
      }
    },
    [onFileSelect, onFilesSelect, multiple]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple,
    disabled,
  });

  // Compact version for adding more images
  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors ${
          isDragActive
            ? 'border-zinc-500 bg-zinc-100 dark:bg-zinc-800'
            : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <svg
          className="h-4 w-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="text-zinc-600 dark:text-zinc-400">Add more</span>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
        isDragActive
          ? 'border-zinc-500 bg-zinc-100 dark:bg-zinc-800'
          : isDragReject
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
            : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-zinc-200 p-4 dark:bg-zinc-700">
          <svg
            className="h-8 w-8 text-zinc-500 dark:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {isDragActive ? (
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
            Drop your {multiple ? 'images' : 'image'} here...
          </p>
        ) : (
          <>
            <div>
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                Drag & drop your {multiple ? 'images' : 'image'} here
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                or click to select {multiple ? 'files' : 'a file'}
              </p>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Supports: JPG, PNG, WebP (max 50MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

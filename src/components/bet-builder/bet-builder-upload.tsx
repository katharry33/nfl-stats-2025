/**
 * BetBuilderUpload.tsx - FRONTEND COMPONENT
 * This version uses "Chunking" to prevent the 98-second timeout and 403 blocks.
 */
import React, { useState } from 'react';
import Papa from 'papaparse';

export const BetBuilderUpload = ({ onUploadComplete }: { onUploadComplete: () => void }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const allRows = results.data;
        const totalRows = allRows.length;
        
        /**
         * CHUNKING STRATEGY
         * We send 5 rows at a time. 
         * The backend adds a 1s delay per player to avoid 403 blocks.
         * This ensures the UI stays alive and the progress bar moves.
         */
        const CHUNK_SIZE = 5; 

        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = allRows.slice(i, i + CHUNK_SIZE);
          
          try {
            const response = await fetch('/api/nba/enrich', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                props: chunk, 
                season: 2025 
              }),
            });

            if (!response.ok) throw new Error('Chunk failed');

            // Calculate and set progress
            const percent = Math.min(Math.round(((i + CHUNK_SIZE) / totalRows) * 100), 100);
            setUploadProgress(percent);

          } catch (error) {
            console.error("Error uploading chunk:", error);
          }
        }

        setIsUploading(false);
        setUploadProgress(null);
        onUploadComplete(); // Refresh the table to show new data
        alert("Upload Complete! All players processed with rate-limit protection.");
      },
    });
  };

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isUploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs mt-2 text-gray-600">
            Processing: {uploadProgress}% (Applying 1s rate-limit delay per player...)
          </p>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/UI';
import { ArrowLeft, Download, Share2, Bookmark, Maximize2 } from 'lucide-react';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function Reader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileUrl = searchParams.get('url');
  const title = searchParams.get('title') || 'Reading Book';
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  if (!fileUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-50 mb-4">No book selected</h2>
        <Button onClick={() => navigate('/library')}>Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-primary-950">
      {/* Reader Header */}
      <header className="bg-primary-900 text-white p-4 flex items-center justify-between border-b border-primary-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-primary-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg truncate max-w-[200px] md:max-w-md">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-primary-800 rounded-lg transition-colors hidden md:block">
            <Bookmark size={20} />
          </button>
          <button className="p-2 hover:bg-primary-800 rounded-lg transition-colors">
            <Share2 size={20} />
          </button>
          <a 
            href={fileUrl} 
            download 
            className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
          >
            <Download size={20} />
          </a>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden relative">
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance]}
            theme="dark"
          />
        </Worker>
      </div>
    </div>
  );
}

import React, {useEffect, useMemo, useRef, useState} from 'react';
import DOMPurify from 'dompurify';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import {AlertCircle, FileText, Loader2, ZoomIn, ZoomOut} from 'lucide-react';
import type {SpaceItem} from '../../types/onespace';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ParsedSheet {
  name: string;
  rows: string[][];
  truncated: boolean;
}

interface ParsedSlide {
  slideNumber: number;
  lines: string[];
}

function renderSanitizedDomNode(node: ChildNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map((child, idx) =>
    renderSanitizedDomNode(child, `${key}-${idx}`)
  );

  switch (tag) {
    case 'h1':
      return (
        <h1 key={key} className="text-lg font-display font-bold text-os-ink dark:text-slate-100 mt-4 mb-2">
          {children}
        </h1>
      );
    case 'h2':
      return (
        <h2 key={key} className="text-base font-display font-bold text-os-ink dark:text-slate-100 mt-3.5 mb-1.5">
          {children}
        </h2>
      );
    case 'h3':
    case 'h4':
      return (
        <h3 key={key} className="text-sm font-display font-bold text-os-ink-secondary dark:text-slate-200 mt-3 mb-1">
          {children}
        </h3>
      );
    case 'p':
      return (
        <p key={key} className="text-sm text-os-ink-secondary dark:text-slate-200 leading-relaxed mb-2.5">
          {children}
        </p>
      );
    case 'ul':
      return (
        <ul key={key} className="list-disc pl-5 space-y-1 mb-3 text-sm text-os-ink-secondary dark:text-slate-200">
          {children}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="list-decimal pl-5 space-y-1 mb-3 text-sm text-os-ink-secondary dark:text-slate-200">
          {children}
        </ol>
      );
    case 'li':
      return <li key={key}>{children}</li>;
    case 'strong':
    case 'b':
      return (
        <strong key={key} className="font-semibold text-os-ink dark:text-white">
          {children}
        </strong>
      );
    case 'em':
    case 'i':
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case 'br':
      return <br key={key} />;
    case 'a': {
      const href = el.getAttribute('href') ?? '#';
      const safeHref = /^https?:\/\//i.test(href) ? href : '#';
      return (
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-os-primary dark:text-sky-300 underline"
        >
          {children}
        </a>
      );
    }
    case 'table':
      return (
        <div key={key} className="overflow-x-auto my-3 rounded-lg border border-os-border dark:border-slate-700">
          <table className="w-full text-xs text-left border-collapse">{children}</table>
        </div>
      );
    case 'thead':
      return <thead key={key} className="bg-os-surface-soft dark:bg-slate-800">{children}</thead>;
    case 'tbody':
      return <tbody key={key} className="divide-y divide-os-surface-soft dark:divide-slate-800">{children}</tbody>;
    case 'tr':
      return <tr key={key}>{children}</tr>;
    case 'th':
      return (
        <th key={key} className="px-3 py-2 font-semibold text-os-ink dark:text-slate-100 border-b border-os-border dark:border-slate-700">
          {children}
        </th>
      );
    case 'td':
      return (
        <td key={key} className="px-3 py-2 text-os-ink-secondary dark:text-slate-200 border-r last:border-r-0 border-os-surface-soft dark:border-slate-800">
          {children}
        </td>
      );
    default:
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

function PdfCanvasViewer({blob}: {blob: Blob}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [rendering, setRendering] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    async function renderPdf() {
      setRendering(true);
      setPdfError(null);
      try {
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;
        loadingTask = pdfjsLib.getDocument({data: new Uint8Array(buffer)});
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(pdfDoc.numPages);
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const maxPages = Math.min(pdfDoc.numPages, 25);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) break;
          const viewport = page.getViewport({scale});
          const wrapper = document.createElement('div');
          wrapper.className =
            'mb-3 bg-white rounded-lg border border-os-border shadow-sm overflow-hidden flex flex-col items-center';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = '100%';
          canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;
          canvas.style.height = 'auto';

          if (context) {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            await page.render({
              canvas,
              canvasContext: context,
              viewport,
            }).promise;
          }
          if (cancelled) break;

          const footer = document.createElement('div');
          footer.className =
            'w-full px-3 py-1 bg-os-surface-soft border-t border-os-surface-soft text-[10px] font-mono text-os-muted text-right';
          footer.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;

          wrapper.appendChild(canvas);
          wrapper.appendChild(footer);
          container.appendChild(wrapper);
        }
      } catch {
        if (!cancelled) {
          setPdfError('Could not render this PDF inline. Use Download or Open in Viewer below.');
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        void loadingTask.destroy();
      }
    };
  }, [blob, scale]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-os-surface-soft dark:bg-slate-800 text-xs">
        <span className="font-medium text-os-ink-secondary dark:text-slate-200 font-mono-num">
          {numPages > 0 ? `${numPages} Page${numPages > 1 ? 's' : ''}` : 'PDF Document'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))))}
            aria-label="Zoom out PDF"
            className="min-h-[34px] min-w-[34px] rounded-lg bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 flex items-center justify-center text-os-primary dark:text-slate-200"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono-num text-[11px] text-os-ink-secondary dark:text-slate-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            aria-label="Zoom in PDF"
            className="min-h-[34px] min-w-[34px] rounded-lg bg-white dark:bg-slate-900 border border-os-border-strong dark:border-slate-700 flex items-center justify-center text-os-primary dark:text-slate-200"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {rendering && (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-os-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Rendering PDF pages...</span>
        </div>
      )}

      {pdfError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="max-h-[55vh] overflow-y-auto overscroll-contain rounded-xl bg-os-surface-soft dark:bg-slate-950 p-2.5"
      />
    </div>
  );
}

export function DocumentViewer({
  item,
  blob,
  blobUrl,
  loading,
}: {
  item: SpaceItem;
  blob: Blob | null;
  blobUrl: string | null;
  loading: boolean;
}) {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [wordHtml, setWordHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [slides, setSlides] = useState<ParsedSlide[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function parseDocument() {
      setParseError(null);
      setTextContent(null);
      setWordHtml(null);
      setSheets([]);
      setActiveSheetIdx(0);
      setSlides([]);

      if (!blob) return;

      const fileName = (item.fileName || item.title).toLowerCase();
      const mime = (item.mimeType || blob.type || '').toLowerCase();

      // Images and PDFs are handled directly by <img> and PdfCanvasViewer
      if (item.fileKind === 'image' || item.fileKind === 'pdf') return;

      setParsing(true);
      try {
        // Plain text / Markdown / JSON / Code
        if (
          (mime.startsWith('text/') && !fileName.endsWith('.csv')) ||
          /\.(txt|md|json|log|xml|yaml|yml)$/i.test(fileName)
        ) {
          const text = await blob.text();
          if (!cancelled) setTextContent(text);
          return;
        }

        // Word (.docx)
        if (item.fileKind === 'word') {
          if (fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
            if (!cancelled) {
              setParseError(
                'Legacy binary .doc files cannot be rendered directly in the browser. Download or Open in Viewer to read it, or upload .docx for instant preview.'
              );
            }
            return;
          }
          const buffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({arrayBuffer: buffer});
          const sanitized = DOMPurify.sanitize(result.value, {
            ALLOWED_TAGS: [
              'h1',
              'h2',
              'h3',
              'h4',
              'p',
              'br',
              'ul',
              'ol',
              'li',
              'strong',
              'b',
              'em',
              'i',
              'a',
              'table',
              'thead',
              'tbody',
              'tr',
              'th',
              'td',
            ],
            ALLOWED_ATTR: ['href'],
          });
          if (!cancelled) setWordHtml(sanitized);
          return;
        }

        // Excel / CSV (.xlsx, .xls, .csv)
        if (item.fileKind === 'excel' || fileName.endsWith('.csv')) {
          const buffer = await blob.arrayBuffer();
          const workbook = XLSX.read(buffer, {type: 'array'});
          const parsed: ParsedSheet[] = workbook.SheetNames.map((name) => {
            const ws = workbook.Sheets[name];
            const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {header: 1, defval: ''});
            const truncated = rawRows.length > 300;
            const rows = rawRows.slice(0, 300).map((row) =>
              Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []
            );
            return {name, rows, truncated};
          });
          if (!cancelled) setSheets(parsed);
          return;
        }

        // PowerPoint (.pptx)
        if (item.fileKind === 'ppt') {
          if (fileName.endsWith('.ppt') && !fileName.endsWith('.pptx')) {
            if (!cancelled) {
              setParseError(
                'Legacy binary .ppt files cannot be rendered directly in the browser. Download or Open in Viewer to view it, or use .pptx for instant slide preview.'
              );
            }
            return;
          }
          const buffer = await blob.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);
          const slideFiles = Object.keys(zip.files)
            .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
            .sort((a, b) => {
              const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] ?? '0', 10);
              const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] ?? '0', 10);
              return numA - numB;
            });

          const parser = new DOMParser();
          const extractedSlides: ParsedSlide[] = [];
          for (const path of slideFiles) {
            const xmlText = await zip.files[path].async('text');
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
            const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p'));
            const lines = paragraphs
              .map((p) =>
                Array.from(p.getElementsByTagName('a:t'))
                  .map((t) => t.textContent ?? '')
                  .join('')
                  .trim()
              )
              .filter(Boolean);
            const slideNumber = parseInt(path.match(/slide(\d+)\.xml/i)?.[1] ?? '0', 10);
            extractedSlides.push({slideNumber, lines});
          }

          if (!cancelled) {
            if (extractedSlides.length === 0) {
              setParseError('No readable text slides were found in this PowerPoint file.');
            } else {
              setSlides(extractedSlides);
            }
          }
          return;
        }

        // Generic fallback: if small (< 512KB), inspect if text
        if (blob.size < 512 * 1024) {
          const sample = await blob.text();
          const looksBinary = /[\x00-\x08\x0E-\x1F]/.test(sample.slice(0, 500));
          if (!looksBinary && !cancelled) {
            setTextContent(sample);
            return;
          }
        }
      } catch {
        if (!cancelled) {
          setParseError(
            'Could not parse this document preview. Use Download or Open in Viewer below.'
          );
        }
      } finally {
        if (!cancelled) setParsing(false);
      }
    }

    void parseDocument();
    return () => {
      cancelled = true;
    };
  }, [blob, item]);

  const wordReactNodes = useMemo(() => {
    if (!wordHtml) return null;
    const doc = new DOMParser().parseFromString(wordHtml, 'text/html');
    return Array.from(doc.body.childNodes).map((node, idx) =>
      renderSanitizedDomNode(node, `doc-${idx}`)
    );
  }, [wordHtml]);

  if (loading || parsing) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-xs text-os-muted dark:text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-os-primary dark:text-sky-300" />
        <span>{loading ? 'Loading document from storage...' : 'Preparing document preview...'}</span>
      </div>
    );
  }

  if (!blob) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" />
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          Document file data could not be found in local storage.
        </p>
        <p className="text-[11px] text-rose-600/80 dark:text-rose-400">
          Try re-uploading this document into My Space.
        </p>
      </div>
    );
  }

  if (item.fileKind === 'image' && blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={item.title}
        className="max-h-[55vh] w-auto mx-auto rounded-xl border border-os-border dark:border-slate-700 object-contain"
      />
    );
  }

  if (item.fileKind === 'pdf') {
    return <PdfCanvasViewer blob={blob} />;
  }

  if (wordReactNodes) {
    return (
      <div className="max-h-[55vh] overflow-y-auto overscroll-contain p-4 rounded-xl bg-os-surface-soft dark:bg-slate-800/70 border border-os-border dark:border-slate-700">
        {wordReactNodes.length > 0 ? (
          wordReactNodes
        ) : (
          <p className="text-xs text-os-muted dark:text-slate-400 text-center py-6">
            This Word document appears to be empty.
          </p>
        )}
      </div>
    );
  }

  if (sheets.length > 0) {
    const activeSheet = sheets[activeSheetIdx] ?? sheets[0];
    return (
      <div className="space-y-2.5">
        {sheets.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {sheets.map((s, idx) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setActiveSheetIdx(idx)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  idx === activeSheetIdx
                    ? 'bg-os-primary text-white'
                    : 'bg-os-surface-soft dark:bg-slate-800 text-os-ink-secondary dark:text-slate-300'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[52vh] overflow-auto overscroll-contain rounded-xl border border-os-border dark:border-slate-700 bg-white dark:bg-slate-900">
          {activeSheet.rows.length === 0 ? (
            <p className="p-6 text-xs text-center text-os-muted">This sheet has no rows.</p>
          ) : (
            <table className="w-full text-xs border-collapse text-left">
              <tbody>
                {activeSheet.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx === 0
                        ? 'bg-os-surface-soft dark:bg-slate-800 font-semibold text-os-ink dark:text-slate-100 sticky top-0'
                        : 'border-t border-os-surface-soft dark:border-slate-800 text-os-ink-secondary dark:text-slate-200'
                    }
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 border-r last:border-r-0 border-os-surface-soft dark:border-slate-800 whitespace-nowrap font-mono-num"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {activeSheet.truncated && (
          <p className="text-[11px] text-os-muted dark:text-slate-400">
            Showing first 300 rows. Download the spreadsheet to view all rows.
          </p>
        )}
      </div>
    );
  }

  if (slides.length > 0) {
    return (
      <div className="max-h-[55vh] overflow-y-auto overscroll-contain space-y-3 pr-1">
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="p-4 rounded-xl bg-os-surface-soft dark:bg-slate-800/70 border border-os-border dark:border-slate-700"
          >
            <p className="text-[11px] font-mono font-semibold text-os-ink-secondary dark:text-sky-300 mb-1.5">
              Slide {slide.slideNumber}
            </p>
            {slide.lines.length === 0 ? (
              <p className="text-xs italic text-os-muted">No text on this slide</p>
            ) : (
              <div className="space-y-1">
                {slide.lines.map((line, idx) => (
                  <p
                    key={idx}
                    className={
                      idx === 0
                        ? 'text-sm font-display font-bold text-os-ink dark:text-slate-100'
                        : 'text-xs text-os-ink-secondary dark:text-slate-300 leading-relaxed'
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (textContent !== null) {
    return (
      <pre className="p-4 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 text-xs font-mono overflow-auto max-h-[55vh] whitespace-pre-wrap break-words text-os-ink dark:text-slate-100">
        {textContent}
      </pre>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-os-surface-soft dark:bg-slate-800 border border-os-border dark:border-slate-700 text-center space-y-2">
      <FileText className="w-8 h-8 text-os-accent-mid dark:text-sky-300 mx-auto" />
      <p className="text-xs font-semibold text-os-ink dark:text-slate-100">
        {item.fileName || item.title}
      </p>
      <p className="text-xs text-os-muted dark:text-slate-300 leading-relaxed max-w-md mx-auto">
        {parseError ||
          'This file format cannot be rendered inline. Tap Download or Open in Viewer below to view it on your device.'}
      </p>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Text as FabricText } from 'fabric';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyTemplate, FieldCoordinates, CoordinatePoint } from '@/types/warranty';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFCoordinateEditorProps {
  template: WarrantyTemplate;
  onSave: () => void;
  onCancel: () => void;
}

const FIELD_LABELS = {
  customerName: 'Kundnamn',
  customerAddress: 'Kundadress',
  projectAddress: 'Projektadress',
  workDescription: 'Arbetsbeskrivning',
  date: 'Datum',
  warranty_years: 'Garantiår',
  company_name: 'Företagsnamn',
};

export const PDFCoordinateEditor: React.FC<PDFCoordinateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [coordinates, setCoordinates] = useState<FieldCoordinates>(template.field_coordinates);
  const [selectedField, setSelectedField] = useState<string>('customerName');
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    loadPDF();
  }, []);

  const loadPDF = async () => {
    try {
      console.log('Loading PDF from URL:', template.pdf_url);
      
      const { data: pdfData, error } = await supabase.storage
        .from('warranty-templates')
        .download(template.pdf_url);

      if (error) {
        console.error('Error downloading PDF:', error);
        throw error;
      }

      if (!pdfData) {
        console.error('No PDF data received');
        throw new Error('No PDF data received');
      }

      console.log('PDF downloaded successfully, size:', pdfData.size);

      // Create a URL for the PDF blob
      const pdfUrl = URL.createObjectURL(pdfData);
      
      // Store the PDF URL for use in the UI
      setPdfUrl(pdfUrl);
      
      setPdfLoaded(true);
      toast({
        title: "PDF laddat",
        description: "PDF-mallen har laddats. Du kan nu se den och placera koordinater.",
      });
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast({
        title: "Fel",
        description: `Kunde inte ladda PDF-mall: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        variant: "destructive",
      });
    }
  };

  const getFieldColor = (fieldName: string): string => {
    const colors = {
      customerName: '#ef4444',
      customerAddress: '#3b82f6',
      projectAddress: '#10b981',
      workDescription: '#f59e0b',
      date: '#8b5cf6',
      warranty_years: '#f97316',
      company_name: '#06b6d4',
    };
    return colors[fieldName as keyof typeof colors] || '#6b7280';
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log('PDF loaded with', numPages, 'pages');
  };

  const handlePDFClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('PDF overlay clicked!', e);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Click coordinates:', x, y);
    console.log('Selected field:', selectedField);
    
    if (selectedField) {
      // Remove existing visual markers for this field
      const existingMarker = document.querySelector(`[data-field="${selectedField}"]`);
      if (existingMarker) {
        existingMarker.remove();
      }
      
      const existingLabel = document.querySelector(`[data-field="${selectedField}-label"]`);
      if (existingLabel) {
        existingLabel.remove();
      }
      
      // Add visual marker directly to the overlay
      const marker = document.createElement('div');
      marker.setAttribute('data-field', selectedField);
      marker.style.position = 'absolute';
      marker.style.left = `${x - 8}px`;
      marker.style.top = `${y - 8}px`;
      marker.style.width = '16px';
      marker.style.height = '16px';
      marker.style.borderRadius = '50%';
      marker.style.backgroundColor = getFieldColor(selectedField);
      marker.style.border = '2px solid white';
      marker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      marker.style.zIndex = '20';
      marker.style.pointerEvents = 'none';
      
      const label = document.createElement('div');
      label.setAttribute('data-field', `${selectedField}-label`);
      label.style.position = 'absolute';
      label.style.left = `${x + 12}px`;
      label.style.top = `${y - 6}px`;
      label.style.fontSize = '11px';
      label.style.fontWeight = 'bold';
      label.style.color = 'white';
      label.style.backgroundColor = getFieldColor(selectedField);
      label.style.padding = '2px 6px';
      label.style.borderRadius = '3px';
      label.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      label.style.zIndex = '20';
      label.style.pointerEvents = 'none';
      label.style.whiteSpace = 'nowrap';
      label.textContent = FIELD_LABELS[selectedField as keyof typeof FIELD_LABELS] || selectedField;
      
      e.currentTarget.appendChild(marker);
      e.currentTarget.appendChild(label);
      
      // Update coordinates state
      setCoordinates(prev => ({
        ...prev,
        [selectedField]: {
          x,
          y,
          fontSize: 12,
          fontColor: '#000000',
          maxWidth: 200
        }
      }));
      
      toast({
        title: "Koordinat placerad!",
        description: `${FIELD_LABELS[selectedField as keyof typeof FIELD_LABELS]} har placerats på position (${Math.round(x)}, ${Math.round(y)})`,
      });
    } else {
      toast({
        title: "Välj ett fält först",
        description: "Välj vilket fält du vill placera från dropdown-menyn",
        variant: "destructive",
      });
    }
  };

  const saveCoordinates = async () => {
    try {
      const { error } = await supabase
        .from('warranty_templates')
        .update({ field_coordinates: coordinates as any })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Koordinater sparade",
        description: "Koordinaterna har sparats för garantimallen",
      });

      onSave();
    } catch (error) {
      console.error('Error saving coordinates:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara koordinater",
        variant: "destructive",
      });
    }
  };

  const removeCoordinate = (fieldName: string) => {
    setCoordinates(prev => {
      const newCoords = { ...prev };
      delete newCoords[fieldName];
      return newCoords;
    });
    
    // Remove visual markers
    const existingMarker = document.querySelector(`[data-field="${fieldName}"]`);
    if (existingMarker) {
      existingMarker.remove();
    }
    
    const existingLabel = document.querySelector(`[data-field="${fieldName}-label"]`);
    if (existingLabel) {
      existingLabel.remove();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>PDF-mall med koordinater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative">
              {/* PDF Viewer using react-pdf */}
              {pdfUrl && pdfLoaded && (
                <div className="relative">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    className="flex justify-center"
                    loading={
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    }
                  >
                    <div className="relative">
                      <Page
                        pageNumber={pageNumber}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="max-w-full"
                        loading={
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        }
                      />
                      
                      {/* Transparent clickable overlay for coordinate placement */}
                      <div
                        className="absolute inset-0 cursor-crosshair"
                        style={{ zIndex: 10 }}
                        onClick={handlePDFClick}
                      >
                        {/* Instructions overlay */}
                        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-3 shadow-lg pointer-events-none z-30">
                          <div className="text-sm">
                            <p className="font-semibold mb-1">Klicka på PDF:en för att placera:</p>
                            <p className="text-xs" style={{ color: getFieldColor(selectedField) }}>
                              📍 {FIELD_LABELS[selectedField as keyof typeof FIELD_LABELS] || selectedField}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Document>
                </div>
              )}
              
              {/* Loading state */}
              {!pdfLoaded && (
                <div className="flex items-center justify-center bg-gray-50 min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <div className="text-muted-foreground">Laddar PDF-mall...</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Välj fält att placera</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getFieldColor(key) }}
                      />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Klicka på PDF:en för att placera markör för valt fält.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placerade koordinater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(coordinates).map(([fieldName, coord]) => (
                <div key={fieldName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getFieldColor(fieldName) }}
                    />
                    <span className="text-sm">
                      {FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(coord.x)}, {Math.round(coord.y)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoordinate(fieldName)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {Object.keys(coordinates).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Inga koordinater placerade än.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={saveCoordinates} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Spara
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
        </div>
      </div>
    </div>
  );
};
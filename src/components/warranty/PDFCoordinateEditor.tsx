import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Text as FabricText } from 'fabric';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [coordinates, setCoordinates] = useState<FieldCoordinates>(template.field_coordinates);
  const [selectedField, setSelectedField] = useState<string>('customerName');
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Circle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('Initializing Fabric Canvas...');
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    setFabricCanvas(canvas);
    
    console.log('Fabric Canvas created:', canvas);
    
    loadPDFIntoCanvas(canvas);

    return () => {
      console.log('Disposing Fabric Canvas');
      canvas.dispose();
    };
  }, []);

  // Separate useEffect for handling canvas clicks with current selectedField
  useEffect(() => {
    if (!fabricCanvas) return;

    console.log('Setting up canvas click handler for field:', selectedField);

    const handleCanvasClick = (e: any) => {
      console.log('Canvas clicked!', e);
      console.log('Selected field:', selectedField);
      console.log('Pointer:', e.pointer);
      
      if (e.pointer && selectedField) {
        const x = e.pointer.x;
        const y = e.pointer.y;
        
        console.log('Placing marker at:', x, y, 'for field:', selectedField);
        
        // Remove existing marker for this field
        removeMarkerForField(selectedField);
        
        // Add new marker
        addMarker(x, y, selectedField);
        
        // Update coordinates
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
        
        console.log('Marker placed successfully');
      } else {
        console.log('Missing pointer or selectedField:', { pointer: e.pointer, selectedField });
      }
    };

    // Remove existing listeners and add new one
    fabricCanvas.off('mouse:down');
    fabricCanvas.on('mouse:down', handleCanvasClick);

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    };
  }, [fabricCanvas, selectedField]);

  const loadPDFIntoCanvas = async (canvas: FabricCanvas) => {
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

      // Create a URL for the PDF blob to display it
      const pdfUrl = URL.createObjectURL(pdfData);
      
      // Show the PDF URL in an iframe as a simple viewer
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.top = '0';
      pdfContainer.style.left = '0';
      pdfContainer.style.width = '100%';
      pdfContainer.style.height = '100%';
      pdfContainer.style.backgroundColor = '#f0f0f0';
      pdfContainer.style.border = '1px solid #ccc';
      pdfContainer.style.borderRadius = '8px';
      pdfContainer.style.overflow = 'hidden';

      // Add text overlay for instructions since PDF rendering is complex
      const instructionText = document.createElement('div');
      instructionText.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          <h3>PDF-mall laddad: ${template.name}</h3>
          <p>Klicka på canvasen för att placera textfält</p>
          <p>PDF-fil: ${template.pdf_url}</p>
          <div style="margin-top: 20px;">
            <a href="${pdfUrl}" target="_blank" style="color: #0066cc; text-decoration: underline;">
              Öppna PDF i ny flik för referens
            </a>
          </div>
        </div>
      `;
      pdfContainer.appendChild(instructionText);

      // Add the container to the canvas container
      const canvasContainer = canvas.getElement().parentElement;
      if (canvasContainer) {
        canvasContainer.style.position = 'relative';
        canvasContainer.appendChild(pdfContainer);
      }
      
      // Set a light gray background for the canvas
      canvas.backgroundColor = '#f8f9fa';
      canvas.renderAll();
      
      // Add existing markers
      Object.entries(coordinates).forEach(([fieldName, coord]) => {
        if (coord) {
          addMarker(coord.x, coord.y, fieldName);
        }
      });
      
      setPdfLoaded(true);
      toast({
        title: "PDF laddat",
        description: "PDF-mallen har laddats. Klicka för att placera koordinater. Öppna PDF i ny flik för referens.",
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

  const addMarker = (x: number, y: number, fieldName: string) => {
    if (!fabricCanvas) {
      console.log('No fabric canvas available');
      return;
    }

    console.log('Adding marker for field:', fieldName, 'at position:', x, y);

    const color = getFieldColor(fieldName);
    const marker = new Circle({
      left: x - 8,
      top: y - 8,
      radius: 8,
      fill: color,
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: true,
      evented: true,
    });
    (marker as any).data = { fieldName };

    const label = new FabricText(FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName, {
      left: x + 12,
      top: y - 6,
      fontSize: 12,
      fill: color,
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    (label as any).data = { fieldName, isLabel: true };

    fabricCanvas.add(marker);
    fabricCanvas.add(label);
    fabricCanvas.renderAll();
    
    console.log('Marker added successfully');
  };

  const removeMarkerForField = (fieldName: string) => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    const toRemove = objects.filter(obj => (obj as any).data?.fieldName === fieldName);
    
    toRemove.forEach(obj => fabricCanvas.remove(obj));
    fabricCanvas.renderAll();
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
    removeMarkerForField(fieldName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>PDF-mall med koordinater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto"
                style={{ display: 'block', minHeight: '400px' }}
              />
            </div>
            {!pdfLoaded ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-muted-foreground">
                  Laddar PDF-mall...
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-success">
                ✓ PDF-mall laddad! Klicka för att placera koordinater.
              </div>
            )}
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